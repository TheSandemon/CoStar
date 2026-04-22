'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle, TrendingUp, Star, ChevronLeft, RefreshCw } from 'lucide-react';
import type { AuditionResults } from '@/lib/audition/types';
import { TranscriptPanel } from './TranscriptPanel';
import { ScoreRing } from './ScoreRing';

interface ResultsScreenProps {
  results: AuditionResults;
  jobTitle: string;
  companyName: string;
  jobId: string;
  onTryAgain: () => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function ResultsScreen({
  results,
  jobTitle,
  companyName,
  jobId,
  onTryAgain,
}: ResultsScreenProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/60">
        <button
          onClick={() => router.push(`/jobs/${jobId}`)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-white font-semibold text-sm">Audition Complete</p>
          <p className="text-slate-500 text-xs">{jobTitle} · {companyName}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 max-w-2xl mx-auto w-full">
        {/* Score */}
        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-slate-800/40 border border-slate-700/40">
          <ScoreRing score={results.score} />
          <div className="text-center space-y-1">
            <p className="text-white font-semibold">
              {results.score >= 75 ? 'Great Performance' : results.score >= 50 ? 'Solid Effort' : 'Keep Practicing'}
            </p>
            <p className="text-slate-400 text-xs">Duration: {formatDuration(results.durationSeconds)}</p>
          </div>
          <p className="text-slate-300 text-sm text-center leading-relaxed">{results.feedback}</p>
        </div>

        {/* Strengths */}
        <div className="space-y-3">
          <h3 className="text-slate-300 text-sm font-semibold flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> Strengths
          </h3>
          <div className="space-y-2">
            {results.strengths.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-slate-300 text-sm">{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Areas to improve */}
        <div className="space-y-3">
          <h3 className="text-slate-300 text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" /> Areas to Improve
          </h3>
          <div className="space-y-2">
            {results.improvements.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20"
              >
                <TrendingUp className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                <p className="text-slate-300 text-sm">{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transcript */}
        <div className="space-y-3">
          <h3 className="text-slate-300 text-sm font-semibold">Full Transcript</h3>
          <div className="bg-slate-800/30 rounded-2xl border border-slate-700/40 p-4 max-h-72 overflow-hidden flex flex-col">
            <TranscriptPanel entries={results.transcript} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <button
            onClick={onTryAgain}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:border-slate-600 text-sm font-medium transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => router.push(`/jobs/${jobId}`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-bold transition-all border border-violet-500/30"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Job
          </button>
        </div>
      </div>
    </div>
  );
}
