export type AuditionPhase =
  | 'setup'
  | 'requesting-permission'
  | 'connecting'
  | 'interviewing'
  | 'ending'
  | 'results';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type AIStatus = 'idle' | 'speaking' | 'listening' | 'processing';
export type MediaMode = 'voice' | 'video';

export interface AuditionConfig {
  difficulty: Difficulty;
  mediaMode: MediaMode;
  focus?: string;
  resume?: string;
}

export interface TranscriptEntry {
  id: string;
  role: 'ai' | 'user';
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface AuditionResults {
  transcript: TranscriptEntry[];
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  durationSeconds: number;
}

export interface AuditionPreset {
  id: string;
  name: string;
  config: AuditionConfig;
}

export interface AuditionSession {
  id: string;
  userId: string;
  date: string;
  mode: 'freeform' | 'job';
  jobTitle: string;
  companyName: string;
  jobId?: string;
  config: AuditionConfig & { voiceName?: string };
  transcript: TranscriptEntry[];
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  durationSeconds: number;
  ultraFeedback?: string;
}
