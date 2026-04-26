'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getScrapedJobById } from '@/lib/jobs';
import { deserializeCareerjetJob } from '@/lib/careerjet';
import { buildSystemPrompt, buildSystemPromptFromText, type PersonaConfig } from '@/lib/audition/systemPrompt';
import type {
  AuditionPhase,
  AuditionConfig,
  AuditionResults,
  AuditionPreset,
  AuditionSession,
} from '@/lib/audition/types';
import type { JobData } from '@/lib/jobs';

import { useGeminiLiveSession, GeminiSessionOverrides, GeminiSessionCredentials } from '@/hooks/useGeminiLiveSession';
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
  numQuestions: 5,
  mediaMode: 'voice',
  focus: '',
  resume: '',
};

// Voice label → Gemini TTS voice name
const VOICE_LABEL_MAP: Record<string, string> = {
  'Young Male': 'Puck',
  'Young Female': 'Aoede',
  'Older Male': 'Charon',
  'Older Female': 'Kore',
};
const ALL_GEMINI_VOICES = ['Puck', 'Aoede', 'Charon', 'Kore'];
const ALL_TONES = ['Professional', 'Friendly', 'Formal', 'Casual', 'Direct', 'Empathetic', 'Encouraging', 'Challenging'];
const ALL_STYLES = ['Structured', 'Conversational', 'Behavioral', 'Technical', 'Socratic', 'STAR-focused'];
const ALL_NAMES = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Chris', 'Riley', 'Casey'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function resolveVoice(voiceSetting: string): string {
  if (voiceSetting === '<Random>') return pick(ALL_GEMINI_VOICES);
  return VOICE_LABEL_MAP[voiceSetting] ?? voiceSetting;
}

function resolvePersona(settings: { interviewerName: string; interviewerTone: string; interviewerStyle: string }): PersonaConfig {
  return {
    name: settings.interviewerName === '<Random>' ? pick(ALL_NAMES) : settings.interviewerName,
    tone: settings.interviewerTone === '<Random>' ? pick(ALL_TONES) : settings.interviewerTone,
    style: settings.interviewerStyle === '<Random>' ? pick(ALL_STYLES) : settings.interviewerStyle,
  };
}

type FeedbackArgs = { score: number; feedback: string; strengths: string[]; improvements: string[] };

export function AuditionPage({ jobId, mode = 'job' }: AuditionPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const pendingEndRef = useRef(false);
  const feedbackResolveRef = useRef<((args: FeedbackArgs) => void) | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveSessionToServer = useCallback(async (data: Partial<AuditionSession> & { id: string }) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      await fetch('/api/audition/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error('[Audition] Server session save failed:', err);
    }
  }, [user]);

  useEffect(() => {
    if (mode !== 'job' || !jobId) return;

    const payloadJob = deserializeCareerjetJob(searchParams.get('job'));
    if (payloadJob && payloadJob.jobId === jobId) {
      setJob(payloadJob);
      return;
    }

    getScrapedJobById(jobId).then((j) => setJob(j ?? null));
  }, [mode, jobId, searchParams]);

  const { entries, addPartial, finalizeLast, reset: resetTranscript } = useTranscript();

  const { isPlaying, enqueueChunk, stop: stopPlayback, close: closePlayback, analyserRef } =
    useAudioPlayback();

  const onFeedback = useCallback((args: FeedbackArgs) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    feedbackResolveRef.current?.(args);
    feedbackResolveRef.current = null;
  }, []);

  const { aiStatus, isConnected, connect, sendAudioChunk, sendClientText, disconnect } = useGeminiLiveSession({
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
    onInterrupted: stopPlayback,
    onInterviewComplete: () => {
      pendingEndRef.current = true;
    },
    onError: (msg) => {
      if (feedbackResolveRef.current) {
        if (feedbackTimeoutRef.current) {
          clearTimeout(feedbackTimeoutRef.current);
          feedbackTimeoutRef.current = null;
        }
        feedbackResolveRef.current({ score: 0, feedback: 'Connection closed before evaluation completed.', strengths: [], improvements: [] });
        feedbackResolveRef.current = null;
      } else {
        setSessionError(msg);
        setPhase('setup');
      }
    },
    onFeedback,
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
      const { key, host } = (await res.json()) as GeminiSessionCredentials;

      const credentials: GeminiSessionCredentials = { key, host };

      const resolvedVoice = resolveVoice(settings.voiceName);
      const persona = resolvePersona(settings);

      const systemPrompt =
        mode === 'freeform'
          ? buildSystemPromptFromText(jobText, config, persona)
          : buildSystemPrompt(job ?? { title: 'this role', companyName: 'the company' }, config, persona);

      await connect(credentials, systemPrompt, config, {
        liveApiHost: settings.liveApiHost || undefined,
        voiceName: resolvedVoice,
      });

      audioCapture.startCapture();
      sessionIdRef.current = Date.now().toString();
      sessionStartRef.current = Date.now();
      interviewStartTimeRef.current = Date.now();

      const resolvedTitle = mode === 'freeform' ? 'Custom Role' : (job?.title ?? 'Unknown Role');
      const resolvedCompany = mode === 'freeform' ? '' : (job?.companyName ?? 'Unknown Company');
      const startedAt = new Date().toISOString();
      saveSessionToServer({
        id: sessionIdRef.current,
        userId: user.uid,
        date: startedAt,
        startedAt,
        status: 'in-progress',
        mode: mode === 'freeform' ? 'freeform' : 'job',
        jobTitle: resolvedTitle,
        companyName: resolvedCompany,
        jobId,
        config: { ...config, voiceName: settings.voiceName },
        transcript: [],
        score: 0,
        feedback: '',
        strengths: [],
        improvements: [],
        durationSeconds: 0,
      });

      setPhase('interviewing');
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Failed to start session');
      setPhase('setup');
    }
  }, [user, job, jobText, mode, config, audioCapture, connect, settings, jobId, saveSessionToServer]);

  const handleEndInterview = useCallback(async () => {
    setPhase('ending');
    audioCapture.stopCapture();
    stopPlayback();

    const durationSeconds = Math.round((Date.now() - interviewStartTimeRef.current) / 1000);
    const finalEntries = entries.map((e) => ({ ...e, isFinal: true }));
    const resolvedTitle = mode === 'freeform' ? 'Custom Role' : (job?.title ?? 'Unknown Role');
    const resolvedCompany = mode === 'freeform' ? '' : (job?.companyName ?? 'Unknown Company');

    const feedback = await new Promise<FeedbackArgs>((resolve) => {
      feedbackResolveRef.current = resolve;
      feedbackTimeoutRef.current = setTimeout(() => {
        feedbackResolveRef.current = null;
        resolve({ score: 0, feedback: 'The AI did not complete the evaluation in time.', strengths: [], improvements: [] });
      }, 60000);
      sendClientText('The interview is now over. Please stop speaking and immediately call the generate_feedback tool to evaluate my performance.');
    });

    disconnect();

    const sessionResults: AuditionResults = {
      transcript: finalEntries,
      score: feedback.score,
      feedback: feedback.feedback,
      strengths: feedback.strengths,
      improvements: feedback.improvements,
      durationSeconds,
    };
    setResults(sessionResults);

    const completedSession = {
      id: sessionIdRef.current,
      userId: user?.uid ?? '',
      date: new Date().toISOString(),
      status: 'completed' as const,
      startedAt: new Date(sessionStartRef.current).toISOString(),
      endedAt: new Date().toISOString(),
      mode: mode === 'freeform' ? 'freeform' as const : 'job' as const,
      jobTitle: resolvedTitle,
      companyName: resolvedCompany,
      jobId,
      config: { ...config, voiceName: settings.voiceName },
      transcript: finalEntries,
      score: feedback.score,
      feedback: feedback.feedback,
      strengths: feedback.strengths,
      improvements: feedback.improvements,
      durationSeconds,
    };

    // Server-side save first (authoritative)
    await saveSessionToServer(completedSession);

    // Client-side save as secondary path
    if (user) {
      try {
        await saveSession(completedSession);
      } catch (err) {
        console.error('[Audition] Client session save failed:', err);
      }
    }

    setPhase('results');
  }, [disconnect, audioCapture, stopPlayback, sendClientText, entries, job, mode, config, settings, user, jobId, saveSession, saveSessionToServer]);

  useEffect(() => {
    if (pendingEndRef.current && !isPlaying) {
      pendingEndRef.current = false;
      handleEndInterview();
    }
  }, [isPlaying, handleEndInterview]);

  const handleCancelInterview = useCallback(() => {
    if (sessionIdRef.current && user) {
      saveSessionToServer({
        id: sessionIdRef.current,
        userId: user.uid,
        status: 'cancelled',
        endedAt: new Date().toISOString(),
        transcript: entries.map((e) => ({ ...e, isFinal: true })),
        durationSeconds: Math.round((Date.now() - interviewStartTimeRef.current) / 1000),
      });
    }
    disconnect();
    audioCapture.stopCapture();
    stopPlayback();
    resetTranscript();
    sessionIdRef.current = '';
    setSessionError(null);
    setPhase('setup');
  }, [disconnect, audioCapture, stopPlayback, resetTranscript, user, entries, saveSessionToServer]);

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
    setConfig((c) => ({ ...c, ...preset.config, numQuestions: preset.config.numQuestions ?? c.numQuestions }));
  }, []);

  const displayTitle = mode === 'freeform' ? 'Custom Interview' : (job?.title ?? 'Interview');
  const displayCompany = mode === 'freeform' ? '' : (job?.companyName ?? '');
  const displayVoiceName = settings.interviewerName === '<Random>' ? 'AI Interviewer' : settings.interviewerName;

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
            micStatus={audioCapture.micStatus}
            micError={audioCapture.error}
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
        voiceName={displayVoiceName}
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
