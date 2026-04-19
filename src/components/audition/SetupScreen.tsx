'use client';

import { Mic, Brain, Users, Shuffle, ChevronRight, Video, Settings, AlertTriangle } from 'lucide-react';
import type { AuditionConfig, InterviewType, Difficulty } from '@/lib/audition/types';
import { GEMINI_CONFIG } from '@/lib/audition/config';
import type { JobData } from '@/lib/jobs';

interface SetupScreenProps {
  job: JobData;
  mode?: 'job' | 'freeform';
  jobText?: string;
  onJobTextChange?: (text: string) => void;
  config: AuditionConfig;
  onConfigChange: (patch: Partial<AuditionConfig>) => void;
  onStart: () => void;
  isRequestingPermission: boolean;
  micError: string | null;
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

const INTERVIEW_TYPES: { value: InterviewType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'technical', label: 'Technical', icon: <Brain className="w-4 h-4" />, desc: 'Skills & architecture' },
  { value: 'behavioral', label: 'Behavioral', icon: <Users className="w-4 h-4" />, desc: 'Experience & culture fit' },
  { value: 'mixed', label: 'Mixed', icon: <Shuffle className="w-4 h-4" />, desc: 'Both types' },
];

const DIFFICULTIES: { value: Difficulty; label: string; color: string; questions: number }[] = [
  { value: 'easy', label: 'Easy', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', questions: GEMINI_CONFIG.questionCount.easy },
  { value: 'medium', label: 'Medium', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', questions: GEMINI_CONFIG.questionCount.medium },
  { value: 'hard', label: 'Hard', color: 'text-red-400 border-red-500/30 bg-red-500/10', questions: GEMINI_CONFIG.questionCount.hard },
];

export function SetupScreen({
  job,
  mode = 'job',
  jobText = '',
  onJobTextChange,
  config,
  onConfigChange,
  onStart,
  isRequestingPermission,
  micError,
  hasApiKey,
  onOpenSettings,
}: SetupScreenProps) {
  const canStart = (mode === 'freeform' ? jobText.trim().length > 0 : true) && hasApiKey;
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className={mode === 'freeform' ? 'space-y-3' : 'text-center space-y-2'}>
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-semibold ${mode === 'freeform' ? '' : 'mb-3'}`}>
              <Mic className="w-3 h-3" />
              AI AUDITION
            </div>
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
              title="Audition settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          {mode === 'freeform' ? (
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium block">
                Paste a job posting
              </label>
              <textarea
                value={jobText}
                onChange={(e) => onJobTextChange?.(e.target.value)}
                placeholder="Paste the full job description here — title, responsibilities, requirements, company info..."
                rows={8}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-slate-200 text-sm resize-none focus:outline-none focus:border-violet-500/50 placeholder-slate-600 leading-relaxed"
              />
              <p className="text-slate-500 text-xs">
                The AI will tailor every question to this posting.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">{job.title}</h1>
              <p className="text-slate-400 text-sm">{job.companyName}</p>
            </>
          )}
        </div>

        {/* Interview Type */}
        <div className="space-y-3">
          <label className="text-slate-300 text-sm font-medium">Interview Type</label>
          <div className="grid grid-cols-3 gap-2">
            {INTERVIEW_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => onConfigChange({ interviewType: t.value })}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  config.interviewType === t.value
                    ? 'bg-violet-600/20 border-violet-500/50 text-violet-200'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                {t.icon}
                <span className="text-xs font-semibold">{t.label}</span>
                <span className="text-xs opacity-70">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="space-y-3">
          <label className="text-slate-300 text-sm font-medium">Difficulty</label>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => onConfigChange({ difficulty: d.value })}
                className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${
                  config.difficulty === d.value
                    ? d.color
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:border-slate-600'
                }`}
              >
                <span>{d.label}</span>
                <span className="text-xs font-normal opacity-70">{d.questions}q</span>
              </button>
            ))}
          </div>
        </div>

        {/* Video mode — Phase 2 stub */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Video className="w-4 h-4" />
            <span>Video + Voice</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-500 text-xs font-medium border border-slate-600/30">
            Coming Soon
          </span>
        </div>

        {/* API key missing warning */}
        {!hasApiKey && (
          <div
            className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm cursor-pointer hover:bg-amber-500/15 transition-colors"
            onClick={onOpenSettings}
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>No Gemini API key configured. <span className="underline">Open settings</span> to add one before starting.</span>
          </div>
        )}

        {/* Mic error */}
        {micError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {micError}
          </div>
        )}

        {/* Start button */}
        <button
          onClick={onStart}
          disabled={isRequestingPermission || !canStart}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl
            bg-gradient-to-r from-violet-600 to-purple-600
            hover:from-violet-500 hover:to-purple-500
            disabled:opacity-50 disabled:cursor-not-allowed
            text-white font-bold text-base transition-all border border-violet-500/30"
        >
          {isRequestingPermission ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Requesting mic...
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Start Audition
              <ChevronRight className="w-4 h-4 ml-auto" />
            </>
          )}
        </button>

        <p className="text-center text-slate-500 text-xs">
          Your browser will ask for microphone permission
        </p>
      </div>
    </div>
  );
}
