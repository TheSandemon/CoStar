'use client';

import { useState } from 'react';
import { Mic, ChevronRight, Video, Settings, AlertTriangle, Clock, BookmarkPlus, X, ChevronDown } from 'lucide-react';
import type { AuditionConfig, Difficulty, AuditionPreset } from '@/lib/audition/types';
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
  onOpenHistory: () => void;
  presets: AuditionPreset[];
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
  onLoadPreset: (preset: AuditionPreset) => void;
}

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
  onOpenHistory,
  presets,
  onSavePreset,
  onDeletePreset,
  onLoadPreset,
}: SetupScreenProps) {
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  const canStart = (mode === 'freeform' ? jobText.trim().length > 0 : true) && hasApiKey;

  function handleSavePreset() {
    const name = presetName.trim();
    if (!name) return;
    onSavePreset(name);
    setPresetName('');
    setSavingPreset(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className={mode === 'freeform' ? 'space-y-3' : 'text-center space-y-2'}>
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-semibold ${mode === 'freeform' ? '' : 'mb-3'}`}>
              <Mic className="w-3 h-3" />
              AI AUDITION
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenHistory}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
                title="Past interviews"
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
                title="Audition settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
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
                rows={6}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-slate-200 text-sm resize-none focus:outline-none focus:border-violet-500/50 placeholder-slate-600 leading-relaxed"
              />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">{job.title}</h1>
              <p className="text-slate-400 text-sm">{job.companyName}</p>
            </>
          )}
        </div>

        {/* Presets */}
        {presets.length > 0 || savingPreset ? (
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium">Presets</label>
            <div className="flex gap-2">
              {presets.length > 0 && (
                <div className="relative flex-1">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const preset = presets.find((p) => p.id === e.target.value);
                      if (preset) onLoadPreset(preset);
                      e.target.value = '';
                    }}
                    className="w-full appearance-none bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-violet-500/50 pr-8"
                  >
                    <option value="" disabled>Load a preset…</option>
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
              {savingPreset ? (
                <div className="flex gap-2 flex-1">
                  <input
                    autoFocus
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePreset();
                      if (e.key === 'Escape') { setSavingPreset(false); setPresetName(''); }
                    }}
                    placeholder="Preset name…"
                    className="flex-1 bg-slate-800/60 border border-violet-500/40 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none placeholder-slate-600"
                  />
                  <button
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                    className="px-3 py-2 rounded-xl bg-violet-600/30 border border-violet-500/40 text-violet-300 text-sm font-medium hover:bg-violet-600/40 disabled:opacity-40 transition-all"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setSavingPreset(false); setPresetName(''); }}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSavingPreset(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 text-sm hover:border-slate-600 hover:text-slate-300 transition-all shrink-0"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  Save
                </button>
              )}
            </div>
            {/* Preset delete list */}
            {presets.length > 0 && !savingPreset && (
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <div key={p.id} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-slate-800/50 border border-slate-700/40 text-slate-400 text-xs">
                    <span>{p.name}</span>
                    <button
                      onClick={() => onDeletePreset(p.id)}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-700 hover:text-slate-200 transition-all"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setSavingPreset(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 text-xs hover:text-slate-300 hover:bg-slate-800/60 transition-all"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Save as preset
            </button>
          </div>
        )}

        {/* Focus */}
        <div className="space-y-2">
          <label className="text-slate-300 text-sm font-medium block">
            Interview Focus <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={config.focus ?? ''}
            onChange={(e) => onConfigChange({ focus: e.target.value })}
            placeholder="e.g. System Design, React, Leadership, AWS..."
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500/50 placeholder-slate-600"
          />
          <p className="text-slate-500 text-xs">The AI will concentrate its questions on this area.</p>
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
                <span className="text-xs font-normal opacity-70"> {d.questions}q</span>
              </button>
            ))}
          </div>
        </div>

        {/* Resume */}
        <div className="space-y-2">
          <label className="text-slate-300 text-sm font-medium block">
            Your Background <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={config.resume ?? ''}
            onChange={(e) => onConfigChange({ resume: e.target.value })}
            placeholder="Paste your resume or describe your experience — the AI will personalize questions to your background..."
            rows={4}
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-slate-200 text-sm resize-none focus:outline-none focus:border-violet-500/50 placeholder-slate-600 leading-relaxed"
          />
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
