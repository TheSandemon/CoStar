'use client';

import { MicOff, Mic, PhoneOff } from 'lucide-react';
import type { AIStatus } from '@/lib/audition/types';
import type { TranscriptEntry } from '@/lib/audition/types';
import { AudioVisualizer } from './AudioVisualizer';
import { TranscriptPanel } from './TranscriptPanel';
import { VideoPreview } from './VideoPreview';

interface InterviewScreenProps {
  jobTitle: string;
  companyName: string;
  aiStatus: AIStatus;
  isConnecting: boolean;
  isMuted: boolean;
  entries: TranscriptEntry[];
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  onToggleMute: () => void;
  onEndInterview: () => void;
}

const STATUS_LABELS: Record<AIStatus, string> = {
  idle: 'Connecting...',
  processing: 'Thinking...',
  speaking: 'Alex is speaking',
  listening: 'Your turn',
};

const STATUS_COLORS: Record<AIStatus, string> = {
  idle: 'text-slate-400',
  processing: 'text-amber-400',
  speaking: 'text-violet-300',
  listening: 'text-emerald-400',
};

export function InterviewScreen({
  jobTitle,
  companyName,
  aiStatus,
  isConnecting,
  isMuted,
  entries,
  analyserRef,
  onToggleMute,
  onEndInterview,
}: InterviewScreenProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
        <div>
          <p className="text-white font-semibold text-sm">{jobTitle}</p>
          <p className="text-slate-500 text-xs">{companyName}</p>
        </div>
        <div className="flex items-center gap-3">
          {isConnecting ? (
            <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Connecting...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  aiStatus === 'listening' ? 'bg-emerald-400 animate-pulse' : 'bg-violet-400'
                }`}
              />
              <span className={`text-xs font-medium ${STATUS_COLORS[aiStatus]}`}>
                {STATUS_LABELS[aiStatus]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-between px-5 py-6 gap-6">
        {/* AI Visualizer */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-700 to-purple-900 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-900/30">
            <span className="text-2xl font-bold text-violet-200">A</span>
          </div>
          <p className="text-slate-400 text-sm font-medium">Alex · AI Interviewer</p>
          <AudioVisualizer analyserRef={analyserRef} aiStatus={aiStatus} />
        </div>

        {/* Video stub */}
        <VideoPreview />

        {/* Transcript */}
        <div className="w-full max-w-2xl flex-1 flex flex-col bg-slate-800/30 rounded-2xl border border-slate-700/40 p-4 min-h-0 max-h-64 overflow-hidden">
          <p className="text-slate-500 text-xs font-medium mb-3 uppercase tracking-wide">
            Live Transcript
          </p>
          <TranscriptPanel entries={entries} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-5 py-5 border-t border-slate-800/60">
        <button
          onClick={onToggleMute}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
            isMuted
              ? 'bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/20'
              : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:border-slate-600'
          }`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {isMuted ? 'Unmute' : 'Mute'}
        </button>

        <button
          onClick={onEndInterview}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30 text-sm font-medium transition-all"
        >
          <PhoneOff className="w-4 h-4" />
          End Interview
        </button>
      </div>
    </div>
  );
}
