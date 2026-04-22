'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getScrapedJobById } from '@/lib/jobs';
import { buildSystemPrompt, buildSystemPromptFromText } from '@/lib/audition/systemPrompt';
import type {
  AuditionPhase,
  AuditionConfig,
  AuditionResults,
  AuditionPreset,
} from '@/lib/audition/types';
import type { JobData } from '@/lib/jobs';

import { useGeminiLiveSession } from '@/hooks/useGeminiLiveSession';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { useTranscript } from '@/hooks/useTranscript';
import { useAuditionSettings } from '@/hooks/useAuditionSettings';
import { useAuditionSessions } from '@/hooks/useAuditionSessions';

import { SetupScreen } from './SetupScreen';
import { InterviewScreen } from './InterviewScreen';
import { ResultsScreen } from './ResultsScreen';
import { AuditionSettingsModal } from './AuditionSettingsModal';

interface AuditionPageProps {
  jobId?: string;
  mode?: 'job' | 'freeform';
}

const DEFAULT_CONFIG: AuditionConfig = {
  difficulty: 'medium',
  mediaMode: 'voice',
  focus: '',
  resume: '',
};

export function AuditionPage({ jobId, mode = 'job' }: AuditionPageProps) {
  const router = useRouter();
  const { user } = useAuth() as { user: { uid: string; getIdToken: () => Promise<string> } | null };

  const [phase, setPhase] = useState<AuditionPhase>('setup');
  const [job, setJob] = useState<JobData | null>(null);
  const [jobText, setJobText] = useState('');
  const [config, setConfig] = useState<AuditionConfig>(DEFAULT_CONFIG);
  const [results, setResults] = useState<AuditionResults | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { settings, save: saveSettings } = useAuditionSettings(user?.uid ?? null);
  const { saveSession } = useAuditionSessions(user?.uid ?? null);

  const sessionStartRef = useRef<number>(0);
  const interviewStartTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    if (mode === 'job' && jobId) {
      getScrapedJobById(jobId).then((j) => setJob(j ?? null));
    }
  }, [mode, jobId]);

  const { entries, addPartial, finalizeLast, reset: resetTranscript } = useTranscript();

  const { isPlaying, enqueueChunk, stop: stopPlayback, close: closePlayback, analyserRef } =
    useAudioPlayback();

  const { aiStatus, isConnected, connect, sendAudioChunk, disconnect } = useGeminiLiveSession({
    onAudioChunk: enqueueChunk,
    onAITranscript: (text, isFinal) => {
      addPartial('ai', text);
      if (isFinal) finalizeLast('ai');
    },
    onUserTranscript: (text, isFinal) => {
      addPartial('user', text);
      if (isFinal) finalizeLast('user');
    },
    onTurnComplete: () => {
      finalizeLast('ai');
      audioCapture.setPaused(false);
    },
    onInterviewComplete: () => {
      handleEndInterview();
    },
    onError: (msg) => {
      setSessionError(msg);
      setPhase('setup');
    },
  });

  const audioCapture = useAudioCapture({
    onChunk: useCallback(
      (base64: string) => {
        if (isConnected) sendAudioChunk(base64);
      },
      [isConnected, sendAudioChunk],
    ),
  });

  useEffect(() => {
    audioCapture.setPaused(isPlaying);
  }, [isPlaying, audioCapture.setPaused]);

  useEffect(() => {
    if (phase === 'setup') {
      audioCapture.preloadPermission();
    }
  }, [phase, audioCapture.preloadPermission]);

  const handleStartAudition = useCallback(async () => {
    setPhase('requesting-permission');
    setSessionError(null);

    const result = await audioCapture.requestPermission();
    if (!result || !result.granted) {
      setSessionError(result?.errorText ?? 'Microphone permission denied');
      setPhase('setup');
      return;
    }

    setPhase('connecting');

    try {
      if (!user) throw new Error('Not authenticated');
      const idToken = await user.getIdToken();

      const res = await fetch('/api/audition/token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get session token');
      }
      const { token } = (await res.json()) as { token: string };

      const voiceName = settings.voiceName || 'Alex';
      const systemPrompt =
        mode === 'freeform'
          ? buildSystemPromptFromText(jobText, config, voiceName)
          : buildSystemPrompt(job ?? { title: 'this role', companyName: 'the company' }, config, voiceName);

      await connect(token, systemPrompt, config, {
        liveModel: settings.liveModel || undefined,
        liveApiHost: settings.liveApiHost || undefined,
        voiceName: settings.voiceName || undefined,
      });

      audioCapture.startCapture();
      sessionIdRef.current = Date.now().toString();
      sessionStartRef.current = Date.now();
      interviewStartTimeRef.current = Date.now();
      setPhase('interviewing');
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Failed to start session');
      setPhase('setup');
    }
  }, [user, job, jobText, mode, config, audioCapture, connect, settings]);

  const handleEndInterview = useCallback(async () => {
    setPhase('ending');
    disconnect();
    audioCapture.stopCapture();
    stopPlayback();

    const durationSeconds = Math.round((Date.now() - interviewStartTimeRef.current) / 1000);
    const finalEntries = entries.map((e) => ({ ...e, isFinal: true }));

    const resolvedTitle = mode === 'freeform' ? 'Custom Role' : (job?.title ?? 'Unknown Role');
    const resolvedCompany = mode === 'freeform' ? '' : (job?.companyName ?? 'Unknown Company');

    try {
      const idToken = user ? await user.getIdToken() : '';
      const res = await fetch('/api/audition/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          transcript: finalEntries,
          jobTitle: resolvedTitle,
          companyName: resolvedCompany,
          focus: config.focus,
          difficulty: config.difficulty,
        }),
      });

      const feedback = res.ok
        ? ((await res.json()) as { score: number; feedback: string; strengths: string[]; improvements: string[] })
        : { score: 0, feedback: 'Could not generate feedback.', strengths: [], improvements: [] };

      const sessionResults: AuditionResults = {
        transcript: finalEntries,
        score: feedback.score,
        feedback: feedback.feedback,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        durationSeconds,
      };

      setResults(sessionResults);

      // Persist session to Firestore
      if (user) {
        await saveSession({
          id: sessionIdRef.current,
          userId: user.uid,
          date: new Date().toISOString(),
          mode: mode === 'freeform' ? 'freeform' : 'job',
          jobTitle: resolvedTitle,
          companyName: resolvedCompany,
          jobId: jobId,
          config: { ...config, voiceName: settings.voiceName || 'Alex' },
          transcript: finalEntries,
          score: feedback.score,
          feedback: feedback.feedback,
          strengths: feedback.strengths,
          improvements: feedback.improvements,
          durationSeconds,
        });
      }
    } catch {
      setResults({
        transcript: finalEntries,
        score: 0,
        feedback: 'Interview complete. Feedback unavailable.',
        strengths: [],
        improvements: [],
        durationSeconds,
      });
    }

    setPhase('results');
  }, [disconnect, audioCapture, stopPlayback, entries, job, jobText, mode, config, settings, user, jobId, saveSession]);

  const handleCancelInterview = useCallback(() => {
    disconnect();
    audioCapture.stopCapture();
    stopPlayback();
    resetTranscript();
    setSessionError(null);
    setPhase('setup');
  }, [disconnect, audioCapture, stopPlayback, resetTranscript]);

  const handleTryAgain = useCallback(() => {
    closePlayback();
    resetTranscript();
    setResults(null);
    setSessionError(null);
    setPhase('setup');
  }, [closePlayback, resetTranscript]);

  const handleConfigChange = useCallback((patch: Partial<AuditionConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
  }, []);

  // Preset handlers
  const handleSavePreset = useCallback((name: string) => {
    const newPreset: AuditionPreset = {
      id: Date.now().toString(),
      name,
      config: { ...config },
    };
    saveSettings({ ...settings, presets: [...settings.presets, newPreset] });
  }, [config, settings, saveSettings]);

  const handleDeletePreset = useCallback((id: string) => {
    saveSettings({ ...settings, presets: settings.presets.filter((p) => p.id !== id) });
  }, [settings, saveSettings]);

  const handleLoadPreset = useCallback((preset: AuditionPreset) => {
    setConfig((c) => ({ ...c, ...preset.config }));
  }, []);

  const displayTitle = mode === 'freeform' ? 'Custom Interview' : (job?.title ?? 'Interview');
  const displayCompany = mode === 'freeform' ? '' : (job?.companyName ?? '');
  const voiceName = settings.voiceName || 'Alex';

  if (phase === 'setup' || phase === 'requesting-permission') {
    return (
      <>
        <SetupScreen
          job={job ?? { title: 'Loading...', companyName: '' }}
          mode={mode}
          jobText={jobText}
          onJobTextChange={setJobText}
          config={config}
          onConfigChange={handleConfigChange}
          onStart={handleStartAudition}
          isRequestingPermission={phase === 'requesting-permission'}
          micError={sessionError}
          hasApiKey={!!settings.geminiApiKey}
          onOpenSettings={() => setShowSettings(true)}
          onOpenHistory={() => router.push('/audition/history')}
          presets={settings.presets}
          onSavePreset={handleSavePreset}
          onDeletePreset={handleDeletePreset}
          onLoadPreset={handleLoadPreset}
        />
        {showSettings && (
          <AuditionSettingsModal
            current={settings}
            onSave={saveSettings}
            onClose={() => setShowSettings(false)}
            onRequestMic={() => audioCapture.requestPermission()}
            onDiagnoseMic={() => audioCapture.diagnoseMic()}
          />
        )}
      </>
    );
  }

  if (phase === 'interviewing' || phase === 'connecting' || phase === 'ending') {
    return (
      <InterviewScreen
        jobTitle={displayTitle}
        companyName={displayCompany}
        voiceName={voiceName}
        aiStatus={aiStatus}
        isConnecting={phase === 'connecting'}
        isMuted={audioCapture.isMuted}
        entries={entries}
        analyserRef={analyserRef}
        onToggleMute={audioCapture.toggleMute}
        onEndInterview={handleEndInterview}
        onCancelInterview={handleCancelInterview}
      />
    );
  }

  if (phase === 'results' && results) {
    return (
      <ResultsScreen
        results={results}
        jobTitle={displayTitle}
        companyName={displayCompany}
        jobId={jobId ?? ''}
        onTryAgain={handleTryAgain}
      />
    );
  }

  return null;
}
