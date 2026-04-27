'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, Mic, MicOff, Radio, AlertTriangle, ChevronDown } from 'lucide-react';
import type { AuditionSettings } from '@/hooks/useAuditionSettings';
import { AUDITION_SETTINGS_DEFAULTS } from '@/hooks/useAuditionSettings';
import type { MicConnectionStatus } from '@/hooks/useAudioCapture';

const VOICE_OPTIONS = [
  { label: '<Random>', value: '<Random>' },
  { label: 'Young Male', value: 'Young Male' },
  { label: 'Young Female', value: 'Young Female' },
  { label: 'Older Male', value: 'Older Male' },
  { label: 'Older Female', value: 'Older Female' },
];

const TONE_OPTIONS = ['<Random>', 'Professional', 'Friendly', 'Formal', 'Casual', 'Direct', 'Empathetic', 'Encouraging', 'Challenging'];
const STYLE_OPTIONS = ['<Random>', 'Structured', 'Conversational', 'Behavioral', 'Technical', 'Socratic', 'STAR-focused'];
const NAME_PRESETS = ['<Random>', 'Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Chris', 'Riley', 'Casey'];

interface AuditionSettingsModalProps {
  current: AuditionSettings;
  onSave: (settings: AuditionSettings) => Promise<void>;
  onClose: () => void;
  onRequestMic?: () => Promise<{ granted: boolean; errorText?: string }>;
  onDiagnoseMic?: () => Promise<string[]>;
  micStatus?: MicConnectionStatus;
  micError?: string | null;
}

export function AuditionSettingsModal({ current, onSave, onClose, onRequestMic, onDiagnoseMic, micStatus = 'unknown', micError }: AuditionSettingsModalProps) {
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

  const statusMeta = getMicStatusMeta(micStatus, micError);
  const StatusIcon = statusMeta.icon;

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
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <StatusIcon className={`h-4 w-4 shrink-0 ${statusMeta.iconClass}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{statusMeta.title}</div>
                    <div className="truncate text-xs text-slate-400">{statusMeta.description}</div>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${statusMeta.badgeClass}`}>
                  {statusMeta.label}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {onRequestMic && (
                <button
                  onClick={async () => {
                    setMicState({ status: 'testing' });
                    const res = await onRequestMic();
                    setMicState(
                      res.granted
                        ? { status: 'success', msg: 'Microphone access granted.' }
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

function getMicStatusMeta(status: MicConnectionStatus, error?: string | null) {
  switch (status) {
    case 'capturing':
      return {
        label: 'Connected',
        title: 'Microphone is connected',
        description: 'Audio capture is active for the current audition.',
        icon: Radio,
        iconClass: 'text-emerald-400',
        badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      };
    case 'granted':
      return {
        label: 'Allowed',
        title: 'Microphone access is allowed',
        description: 'CoStar can use your microphone when an audition starts.',
        icon: Mic,
        iconClass: 'text-emerald-400',
        badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      };
    case 'prompt':
      return {
        label: 'Needs approval',
        title: 'Microphone permission has not been granted',
        description: 'Use Grant Mic Access to approve browser microphone access.',
        icon: Mic,
        iconClass: 'text-amber-400',
        badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      };
    case 'denied':
      return {
        label: 'Blocked',
        title: 'Microphone access is blocked',
        description: 'Allow microphone access in your browser site settings.',
        icon: MicOff,
        iconClass: 'text-red-400',
        badgeClass: 'border-red-500/30 bg-red-500/10 text-red-300',
      };
    case 'unsupported':
      return {
        label: 'Unavailable',
        title: 'Microphone access is unavailable',
        description: 'Use HTTPS or localhost in a browser that supports media devices.',
        icon: AlertTriangle,
        iconClass: 'text-red-400',
        badgeClass: 'border-red-500/30 bg-red-500/10 text-red-300',
      };
    case 'error':
      return {
        label: 'Error',
        title: 'Microphone needs attention',
        description: error || 'The last microphone request failed.',
        icon: AlertTriangle,
        iconClass: 'text-red-400',
        badgeClass: 'border-red-500/30 bg-red-500/10 text-red-300',
      };
    default:
      return {
        label: 'Unknown',
        title: 'Microphone status is unknown',
        description: 'Grant access or run diagnostics to check this browser.',
        icon: Mic,
        iconClass: 'text-slate-400',
        badgeClass: 'border-slate-600 bg-slate-800 text-slate-300',
      };
  }
}
