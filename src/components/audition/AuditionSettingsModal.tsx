'use client';

import { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import type { AuditionSettings } from '@/hooks/useAuditionSettings';
import { AUDITION_SETTINGS_DEFAULTS } from '@/hooks/useAuditionSettings';

const VOICES = ['Aoede', 'Charon', 'Fenrir', 'Kore', 'Puck'];

interface AuditionSettingsModalProps {
  current: AuditionSettings;
  onSave: (settings: AuditionSettings) => Promise<void>;
  onClose: () => void;
  onRequestMic?: () => Promise<{ granted: boolean; errorText?: string }>;
  onDiagnoseMic?: () => Promise<string[]>;
}

export function AuditionSettingsModal({ current, onSave, onClose, onRequestMic, onDiagnoseMic }: AuditionSettingsModalProps) {
  const [form, setForm] = useState<AuditionSettings>(current);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [micState, setMicState] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; msg?: string; lines?: string[] }>({ status: 'idle' });

  const patch = (field: keyof AuditionSettings, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.geminiApiKey.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-base">Audition Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permissions */}
        {(onRequestMic || onDiagnoseMic) && (
          <div className="space-y-2 pb-2 border-b border-slate-700/50">
            <label className="text-slate-300 text-sm font-medium">Browser Microphone</label>
            <div className="flex gap-2">
              {onRequestMic && (
                <button
                  onClick={async () => {
                    setMicState({ status: 'testing' });
                    const res = await onRequestMic();
                    setMicState(
                      res.granted
                        ? { status: 'success', msg: 'Microphone access granted ✓' }
                        : { status: 'error', msg: res.errorText || 'Permission denied' }
                    );
                  }}
                  disabled={micState.status === 'testing'}
                  className="px-4 py-2 rounded-xl bg-violet-700/30 border border-violet-600/40 text-violet-200 text-sm font-medium hover:bg-violet-700/50 transition-colors disabled:opacity-50"
                >
                  {micState.status === 'testing' ? 'Requesting...' : 'Grant Mic Access'}
                </button>
              )}
              {onDiagnoseMic && (
                <button
                  onClick={async () => {
                    setMicState({ status: 'testing' });
                    const lines = await onDiagnoseMic();
                    setMicState({ status: 'idle', lines });
                  }}
                  disabled={micState.status === 'testing'}
                  className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Diagnose
                </button>
              )}
            </div>
            {micState.status === 'success' && (
              <p className="text-emerald-400 text-xs">{micState.msg}</p>
            )}
            {micState.status === 'error' && (
              <p className="text-red-400 text-xs">{micState.msg}</p>
            )}
            {micState.lines && micState.lines.length > 0 && (
              <div className="mt-1 p-2 rounded-lg bg-slate-950/60 border border-slate-700/50 font-mono text-xs text-slate-300 space-y-0.5">
                {micState.lines.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
            <p className="text-slate-500 text-xs">If the popup never appears, click Diagnose to identify the issue.</p>
          </div>
        )}

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="text-slate-300 text-sm font-medium">Gemini API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.geminiApiKey}
              onChange={(e) => patch('geminiApiKey', e.target.value)}
              placeholder="AIza..."
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 pr-10 text-slate-200 text-sm focus:outline-none focus:border-amber-500 placeholder-slate-600"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-slate-500 text-xs">
            Required. Get yours at{' '}
            <span className="text-violet-400">aistudio.google.com</span>
          </p>
        </div>

        {/* Voice */}
        <div className="space-y-1.5">
          <label className="text-slate-300 text-sm font-medium">AI Voice</label>
          <div className="flex gap-2 flex-wrap">
            {VOICES.map((v) => (
              <button
                key={v}
                onClick={() => patch('voiceName', v)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  form.voiceName === v
                    ? 'bg-violet-600/20 border-violet-500/50 text-violet-200'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm font-semibold hover:border-slate-600 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.geminiApiKey.trim()}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 text-sm font-bold transition-all"
          >
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
