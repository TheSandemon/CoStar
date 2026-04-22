'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ChevronLeft, Mic, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAuditionSessions } from '@/hooks/useAuditionSessions';
import type { AuditionSession } from '@/lib/audition/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function difficultyColor(difficulty: string): string {
  if (difficulty === 'easy') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (difficulty === 'medium') return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  return 'text-red-400 border-red-500/30 bg-red-500/10';
}

export function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth() as { user: { uid: string } | null };
  const { getSessions, deleteSession } = useAuditionSessions(user?.uid ?? null);

  const [sessions, setSessions] = useState<AuditionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSessions();
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }, [getSessions]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDeletingId(id);
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/60">
        <button
          onClick={() => router.push('/audition')}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-white font-semibold text-sm">Interview History</p>
          <p className="text-slate-500 text-xs">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800/60 border border-slate-700/40 flex items-center justify-center">
              <Clock className="w-7 h-7 text-slate-500" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-300 font-medium">No past interviews yet</p>
              <p className="text-slate-500 text-sm">Complete an audition to see your history here.</p>
            </div>
            <button
              onClick={() => router.push('/audition')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-600/30 transition-all"
            >
              <Mic className="w-4 h-4" />
              Start an Audition
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => router.push(`/audition/history/${session.id}`)}
                className="group relative flex items-center gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 hover:bg-slate-800/60 cursor-pointer transition-all"
              >
                {/* Score */}
                <div className={`text-2xl font-bold tabular-nums shrink-0 w-12 text-center ${scoreColor(session.score)}`}>
                  {session.score}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-white font-semibold text-sm truncate">{session.jobTitle}</p>
                  {session.companyName && (
                    <p className="text-slate-500 text-xs truncate">{session.companyName}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${difficultyColor(session.config.difficulty)}`}>
                      {session.config.difficulty}
                    </span>
                    {session.config.focus && (
                      <span className="text-slate-500 text-xs truncate max-w-[160px]">{session.config.focus}</span>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs">{formatDate(session.date)}</p>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => handleDelete(e, session.id)}
                  disabled={deletingId === session.id}
                  className="opacity-0 group-hover:opacity-100 shrink-0 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Delete session"
                >
                  {deletingId === session.id ? (
                    <div className="w-4 h-4 border-2 border-slate-700 border-t-red-400 rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
