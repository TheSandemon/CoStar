'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getScrapedJobById } from '@/lib/jobs';
import { buildSystemPrompt, buildSystemPromptFromText } from '@/lib/audition/systemPrompt';
import type {
  AuditionPhase,
  AuditionConfig,
  AuditionResults,
} from '@/lib/audition/types';
import type { JobData } from '@/lib/jobs';

import { useGeminiLiveSession } from '@/hooks/useGeminiLiveSession';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { useTranscript } from '@/hooks/useTranscript';

import { SetupScreen } from './SetupScreen';
import { InterviewScreen } from './InterviewScreen';
import { ResultsScreen } from './ResultsScreen';

interface AuditionPageProps {
  jobId?: string;
  mode?: 'job' | 'freeform';
}

const DEFAULT_CONFIG: AuditionConfig = {
  interviewType: 'mixed',
  difficulty: 'medium',
  mediaMode: 'voice',
};

export function AuditionPage({ jobId, mode = 'job' }: AuditionPageProps) {
  const { user } = useAuth() as { user: { getIdToken: () => Promise<string> } | null };

  const [phase, setPhase] = useState<AuditionPhase>('setup');
  const [job, setJob] = useState<JobData | null>(null);
  const [jobText, setJobText] = useState('');
  const [config, setConfig] = useState<AuditionConfig>(DEFAULT_CONFIG);
  const [results, setResults] = useState<AuditionResults | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const sessionStartRef = useRef<number>(0);
  const interviewStartTimeRef = useRef<number>(0);

  // Load job data in job mode only
  useEffect(() => {
    if (mode === 'job' && jobId) {
      getScrapedJobById(jobId).then((j) => setJob(j ?? null));
    }
  }, [mode, jobId]);

  // Transcript
  const { entries, addPartial, finalizeLast, reset: resetTranscript } = useTranscript();

  // Audio playback
  const { isPlaying, enqueueChunk, stop: stopPlayback, close: closePlayback, analyserRef } =
    useAudioPlayback();

  // Gemini session
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

  // Audio capture — paused while AI is playing audio
  const audioCapture = useAudioCapture({
    onChunk: useCallback(
      (base64: string) => {
        if (isConnected) sendAudioChunk(base64);
      },
      [isConnected, sendAudioChunk],
    ),
  });

  // Pause mic capture while AI is playing audio
  useEffect(() => {
    audioCapture.setPaused(isPlaying);
  }, [isPlaying, audioCapture.setPaused]);

  const handleStartAudition = useCallback(async () => {
    setPhase('requesting-permission');
    setSessionError(null);

    const granted = await audioCapture.requestPermission();
    if (!granted) {
      setSessionError(audioCapture.error ?? 'Microphone permission denied');
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

      if (!res.ok) throw new Error('Failed to get session token');
      const { token } = (await res.json()) as { token: string };

      const systemPrompt =
        mode === 'freeform'
          ? buildSystemPromptFromText(jobText, config)
          : buildSystemPrompt(job ?? { title: 'this role', companyName: 'the company' }, config);

      await connect(token, systemPrompt, config);

      audioCapture.startCapture();
      sessionStartRef.current = Date.now();
      interviewStartTimeRef.current = Date.now();
      setPhase('interviewing');
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Failed to start session');
      setPhase('setup');
    }
  }, [user, job, jobText, mode, config, audioCapture, connect]);

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
      const res = await fetch('/api/audition/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: finalEntries,
          jobTitle: resolvedTitle,
          companyName: resolvedCompany,
          interviewType: config.interviewType,
          difficulty: config.difficulty,
        }),
      });

      const feedback = res.ok
        ? ((await res.json()) as { score: number; feedback: string; strengths: string[]; improvements: string[] })
        : { score: 0, feedback: 'Could not generate feedback.', strengths: [], improvements: [] };

      setResults({
        transcript: finalEntries,
        score: feedback.score,
        feedback: feedback.feedback,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        durationSeconds,
      });
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
  }, [disconnect, audioCapture, stopPlayback, entries, job, jobText, mode, config]);

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

  const displayTitle = mode === 'freeform' ? 'Custom Interview' : (job?.title ?? 'Interview');
  const displayCompany = mode === 'freeform' ? '' : (job?.companyName ?? '');

  if (phase === 'setup' || phase === 'requesting-permission') {
    return (
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
      />
    );
  }

  if (phase === 'interviewing' || phase === 'connecting' || phase === 'ending') {
    return (
      <InterviewScreen
        jobTitle={displayTitle}
        companyName={displayCompany}
        aiStatus={aiStatus}
        isConnecting={phase === 'connecting'}
        isMuted={audioCapture.isMuted}
        entries={entries}
        analyserRef={analyserRef}
        onToggleMute={audioCapture.toggleMute}
        onEndInterview={handleEndInterview}
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
