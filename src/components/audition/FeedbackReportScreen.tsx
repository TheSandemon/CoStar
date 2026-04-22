'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, CheckCircle, TrendingUp, Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAuditionSessions } from '@/hooks/useAuditionSessions';
import { ScoreRing } from './ScoreRing';
import { TranscriptPanel } from './TranscriptPanel';
import type { AuditionSession } from '@/lib/audition/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

interface FeedbackReportScreenProps {
  sessionId: string;
}

export function FeedbackReportScreen({ sessionId }: FeedbackReportScreenProps) {
  const router = useRouter();
  const { user } = useAuth() as { user: { uid: string } | null };
  const { getSession } = useAuditionSessions(user?.uid ?? null);

  const [session, setSession] = useState<AuditionSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSession(sessionId);
      if (data) {
        setSession(data);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [getSession, sessionId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !session) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">Session not found.</p>
        <button
          onClick={() => router.push('/audition/history')}
          className="text-violet-400 text-sm hover:text-violet-300 transition-colors"
        >
          ← Back to history
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/60">
        <button
          onClick={() => router.push('/audition/history')}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-white font-semibold text-sm">{session.jobTitle}</p>
          <p className="text-slate-500 text-xs">
            {session.companyName ? `${session.companyName} · ` : ''}{formatDate(session.date)}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 max-w-2xl mx-auto w-full">
        {/* Score */}
        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-slate-800/40 border border-slate-700/40">
          <ScoreRing score={session.score} />
          <div className="text-center space-y-1">
            <p className="text-white font-semibold">
              {session.score >= 75 ? 'Great Performance' : session.score >= 50 ? 'Solid Effort' : 'Keep Practicing'}
            </p>
            <p className="text-slate-400 text-xs">
              Duration: {formatDuration(session.durationSeconds)}
              {session.config.difficulty && ` · ${session.config.difficulty} difficulty`}
              {session.config.focus && ` · ${session.config.focus}`}
            </p>
          </div>
          <p className="text-slate-300 text-sm text-center leading-relaxed">{session.feedback}</p>
        </div>

        {/* Strengths */}
        {session.strengths.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-slate-300 text-sm font-semibold flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" /> Strengths
            </h3>
            <div className="space-y-2">
              {session.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-slate-300 text-sm">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Areas to improve */}
        {session.improvements.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-slate-300 text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" /> Areas to Improve
            </h3>
            <div className="space-y-2">
              {session.improvements.map((s, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
                  <TrendingUp className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                  <p className="text-slate-300 text-sm">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript */}
        {session.transcript.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-slate-300 text-sm font-semibold">Full Transcript</h3>
            <div className="bg-slate-800/30 rounded-2xl border border-slate-700/40 p-4 max-h-96 overflow-hidden flex flex-col">
              <TranscriptPanel entries={session.transcript} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <button
            onClick={() => router.push('/audition/history')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:border-slate-600 text-sm font-medium transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to History
          </button>
          <button
            onClick={() => router.push('/audition')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-bold transition-all border border-violet-500/30"
          >
            New Audition
          </button>
        </div>
      </div>
    </div>
  );
}
