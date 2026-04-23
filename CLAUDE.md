# CoStar – Agent & AI Context

This document is read by all AI coding agents (Claude, Gemini CLI, etc.) working in this repository.
It documents hard-won lessons, gotchas, and non-obvious decisions to prevent regression.

---

## Project Overview

CoStar is a Next.js (App Router) web application that helps users practice job interviews using Google's Gemini Multimodal Live API. Key features:
- **Audition** – Real-time AI voice interview via WebSocket (Gemini Live API)
- **Job Board** – Scraped job listings stored in Firestore
- **Auth** – Firebase Authentication (Google sign-in)
- **Settings** – Per-user Gemini API key, voice, model stored in Firestore (`auditionSettings/{uid}`)

---

## Critical: Gemini Live API WebSocket Protocol

> ⚠️ This section documents battle-tested fixes. Do NOT revert these without strong evidence from the official docs.

### 1. DO NOT Use Ephemeral Tokens With gemini-3.1-flash-live-preview

**This is the root cause of all 1007 errors in this project.**

The ephemeral token approach (`BidiGenerateContentConstrained` / `v1alpha` / `access_token`) returns:
```
1007 — token-based requests cannot use project-scoped features such as tuned models
```

`gemini-3.1-flash-live-preview` is treated as a project-scoped model and **cannot be accessed via ephemeral tokens**.

**The working approach** (confirmed from the Audition reference project at `C:\Users\Sand\Desktop\Coding\Audition`):
- Use **`v1beta`** API version
- Use **`BidiGenerateContent`** (no `Constrained` suffix)
- Authenticate with **`?key=`** — pass the API key directly in the URL

```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={API_KEY}
```

**Security**: The API key is never exposed in client-side source. The frontend calls `/api/audition/token` (Firebase-auth-gated), which reads the key from Firestore/env and returns it at runtime only to authenticated users.

### 2. Setup Message Format

The first message sent after open must use `setup` as the top-level key:

```json
{
  "setup": {
    "model": "models/gemini-3.1-flash-live-preview",
    "systemInstruction": { "parts": [{ "text": "..." }] },
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": { "voiceName": "Aoede" }
        }
      }
    },
    "inputAudioTranscription": {},
    "outputAudioTranscription": {}
  }
}
```

**Wrong** (causes 1007):
- `{ "config": { ... } }` — incorrect top-level key

### 3. All WebSocket Message Keys Must Be camelCase

| ❌ Wrong (snake_case) | ✅ Correct (camelCase) |
|---|---|
| `system_instruction` | `systemInstruction` |
| `generation_config` | `generationConfig` |
| `response_modalities` | `responseModalities` |
| `speech_config` | `speechConfig` |
| `voice_config` | `voiceConfig` |
| `prebuilt_voice_config` | `prebuiltVoiceConfig` |
| `voice_name` | `voiceName` |
| `input_audio_transcription` | `inputAudioTranscription` |
| `output_audio_transcription` | `outputAudioTranscription` |
| `realtime_input` | `realtimeInput` |
| `mime_type` | `mimeType` |

### 4. Audio Chunk Message Format

```json
{
  "realtimeInput": {
    "audio": {
      "mimeType": "audio/pcm;rate=16000",
      "data": "<base64-encoded PCM>"
    }
  }
}
```

### 5. Correct Live API Model Name

```
models/gemini-3.1-flash-live-preview
```

Must include the `models/` prefix. The `-live-` variant is required for the Live API.

### 6. `inputAudioTranscription` Must Be an Empty Object

```json
"inputAudioTranscription": {}
```

Do NOT pass a `model` field inside it — the server rejects it.

### 7. `/api/audition/token` Route — What It Does

The route is Firebase-auth-gated and returns `{ key, host, liveModel }`. The client uses these to build the WebSocket URL. No ephemeral token minting occurs.

### 8. WebSocket Close Codes Reference

| Code | Meaning in this context |
|---|---|
| `1007` | Invalid frame payload — wrong setup JSON structure, OR model not compatible with auth method |
| `1008` | Policy violation — wrong endpoint or unsupported auth parameter |
| `1000` / `1005` | Normal/clean close — not an error |

### 9. `connect()` Must Be a Promise That Awaits `onopen`

The `connect()` function in `useGeminiLiveSession.ts` returns a `Promise<void>` that **only resolves after `ws.onopen` fires**. If `onerror` or `onclose` fires before `onopen`, the promise must **reject** so the caller can reset the UI phase.

---

## Firebase Auth: Preview Deployment Logins

**Problem**: Signing in on Vercel preview URLs fails because Firebase Auth blocks sign-ins from unlisted domains.

**Fix**: Go to Firebase Console → Authentication → Settings → Authorized Domains → Add the preview domain.

For Vercel preview deployments, you can add `vercel.app` to authorize all Vercel subdomains (acceptable for dev/test). For production, only add your specific production domain.

---

## Architecture Notes

### Audition Flow (phase state machine)

```
setup → requesting-permission → connecting → interviewing → ending → results
```

- `setup`: SetupScreen shown. Mic permission pre-loaded silently.
- `requesting-permission`: Await `audioCapture.requestPermission()`.
- `connecting`: Token fetched from `/api/audition/token`, WebSocket connecting.
- `interviewing`: WebSocket open & setup sent, audio capture streaming.
- `ending`: Interview stopped, feedback API called.
- `results`: ResultsScreen shown.

On any error after `connecting`, the phase must reset to `setup` and the error must be surfaced.

### Per-User Settings (Firestore)

Stored at `auditionSettings/{uid}`:
- `geminiApiKey` — user's personal Gemini API key (overrides env var)
- `voiceName` — AI voice (Aoede, Charon, Fenrir, Kore, Puck)
- `liveModel` — override for Live model name
- `liveApiHost` — override for WebSocket host
- `presets` — saved interview config presets (array)

### API Routes

- `POST /api/audition/token` — Mints an ephemeral Gemini token. Requires Firebase `Authorization: Bearer <idToken>` header. Reads user API key from Firestore. Returns `{ token: string }`.
- `POST /api/audition/feedback` — Generates post-interview score/feedback via standard Gemini REST API.

---

## Deployment

- **Platform**: Vercel
- **Environment variables required**:
  - `GEMINI_API_KEY` — fallback API key
  - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Admin SDK credentials
  - Firebase client config vars (`NEXT_PUBLIC_FIREBASE_*`)
- `FIREBASE_PRIVATE_KEY` must have `\n` replaced with actual newlines in Vercel (the route handler does `.replace(/\\n/g, '\n')`)
