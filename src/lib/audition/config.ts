// ─── Gemini Audition Configuration ───────────────────────────────────────────
// All model names, voices, and API parameters are centralized here.
// Change any value in this file to update behavior across the entire feature.

export const GEMINI_CONFIG = {
  // Live (real-time streaming) model — used for the voice interview session
  liveModel: 'models/gemini-3.1-flash-live-preview',

  // Standard (non-streaming) model — used for post-interview feedback scoring
  feedbackModel: 'gemini-3.1-flash-live-preview',

  // WebSocket host for the Live API
  liveApiHost: 'generativelanguage.googleapis.com',

  // Voice for the AI interviewer
  // Options: 'Aoede', 'Charon', 'Fenrir', 'Kore', 'Puck'
  voiceName: 'Aoede',

  // Output modalities from the live session
  responseModalities: ['AUDIO'] as string[],

  // Audio sample rates
  inputSampleRate: 16000,   // mic capture rate (PCM sent to Gemini)
  outputSampleRate: 24000,  // playback rate (PCM received from Gemini)

  // Feedback generation
  feedbackTemperature: 0.3,

  // Question count per difficulty level (replaces time limit)
  questionCount: {
    easy: 5,
    medium: 8,
    hard: 12,
  } as Record<string, number>,

  // Ephemeral token lifetime (milliseconds)
  tokenTtlMs: 30 * 60 * 1000,       // 30 minutes
  sessionTtlMs: 2 * 60 * 1000,      // 2 minutes new-session window
} as const;
