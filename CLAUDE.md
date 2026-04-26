# CoStar – Agent & AI Context

This document is read by all AI coding agents (Claude, Gemini CLI, etc.) working in this repository.
It documents hard-won lessons, gotchas, and non-obvious decisions to prevent regression.

---

## Project Overview

CoStar is a Next.js (App Router) web application that helps users practice job interviews using Google's Gemini Multimodal Live API. Key features:
- **Audition** – Real-time AI voice interview via WebSocket (Gemini Live API)
- **Job Board** – Scraped job listings stored in Firestore
- **Auth** – Firebase Authentication (Google sign-in)
- **Settings** – Per-user Gemini API key, voice, and interviewer persona stored in Firestore (`auditionSettings/{uid}`)

---

## Critical: Gemini Live API WebSocket Protocol

> ⚠️ This section documents battle-tested fixes. Do NOT revert these without strong evidence from the official docs.

### 1. DO NOT Use Ephemeral Tokens With gemini-3.1-flash-live-preview

**This is the root cause of all 1007 errors in this project.**

The ephemeral token approach (`BidiGenerateContentConstrained` / `access_token`) returns:
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

**Why not BidiGenerateContentConstrained?** That endpoint requires ephemeral tokens (`access_token`), which fail with `1007: token-based requests cannot use project-scoped features` for this model.

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

The setup also includes a `tools` array with the `generate_feedback` function declaration — see `useGeminiLiveSession.ts` for the full schema.

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

The route is Firebase-auth-gated and returns `{ key, host }`. The client uses these to build the WebSocket URL. No ephemeral token minting occurs. The `liveModel` defaults to `GEMINI_CONFIG.liveModel` on the client when not overridden by user settings.

### 8. WebSocket Close Codes Reference

| Code | Meaning in this context |
|---|---|
| `1007` | Invalid frame payload — wrong setup JSON structure, OR model not compatible with auth method |
| `1008` | Policy violation — wrong endpoint or unsupported auth parameter |
| `1000` / `1005` | Normal/clean close — not an error |

### 9. `connect()` Must Be a Promise That Awaits `onopen`

The `connect()` function in `useGeminiLiveSession.ts` returns a `Promise<void>` that **only resolves after `ws.onopen` fires**. If `onerror` or `onclose` fires before `onopen`, the promise must **reject** so the caller can reset the UI phase.

### 10. Audio Must Be Gated On `setupComplete`

**Do not send audio chunks before `setupComplete` is received from the server.**

`sendAudioChunk` is gated behind a `setupReadyRef` flag that starts `false` and is set to `true` only when `setupComplete` arrives. This is critical: sending audio before `setupComplete` competes with the initial text turn ("Hello.") that triggers the AI's opening introduction, causing the AI to never speak first.

After `setupComplete`:
1. `setupReadyRef.current` is set to `true` (unblocking audio)
2. A `clientContent` turn with `"Hello."` is sent to prompt the AI's opening

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
- `interviewing`: WebSocket open & setup sent. Audio gated until `setupComplete`. AI speaks first.
- `ending`: Interview stopped, feedback requested via `generate_feedback` tool call.
- `results`: ResultsScreen shown.

On any error after `connecting`, the phase must reset to `setup` and the error must be surfaced.

### Static Account Types and Admin/Owner Access

Account type is an immutable identity path stored on `users/{uid}`:
- Public paths: `talent`, `business`, `agency`
- Hidden privileged paths: `admin`, `owner`

> Note: the legacy string `"user"` is normalized to `"talent"` in `firebaseAdmin.ts` for backward compatibility, but `talent` is the canonical type. Do not use `"user"` in new code.

Public sign-up must only expose `talent`, `business`, and `agency`. Do not add `admin` or `owner` as selectable UI options.

`kyletouchet@gmail.com` is the hardcoded owner bootstrap email. `POST /api/account/bootstrap` verifies the Firebase ID token server-side and forces that email to:
- `accountType: "owner"`
- `role: "owner"`
- `accountTypeLocked: true`
- `accountTypeSource: "system"`

Admin/owner users should use `/admin`, not normal onboarding. Admin APIs must verify the Firebase ID token and read the caller profile from Firestore; never trust client UI state for admin authorization.

Admin routes:
- `GET /api/admin/summary` — admin/owner only, returns counts and recent users.
- `POST /api/admin/users/set-role` — owner only, promotes/demotes admins by email.
- `POST /api/admin/users/set-status` — admin/owner only, suspends/reactivates users and toggles public profile visibility.

### Per-User Settings (Firestore)

Stored at `auditionSettings/{uid}`:
- `geminiApiKey` — user's personal Gemini API key (overrides env var)
- `voiceName` — AI voice (Aoede, Charon, Kore, Puck, or `<Random>`)
- `liveApiHost` — override for WebSocket host (defaults to `generativelanguage.googleapis.com`)
- `interviewerName` — AI interviewer name (or `<Random>`)
- `interviewerTone` — interviewer tone (Professional, Friendly, Formal, Casual, Direct, Empathetic, Encouraging, Challenging, or `<Random>`)
- `interviewerStyle` — interview methodology (Structured, Conversational, Behavioral, Technical, Socratic, STAR-focused, or `<Random>`)
- `presets` — saved interview config presets (array of `AuditionPreset`)

### Session History (Firestore)

Every interview session is persisted at `auditionSessions/{uid}/sessions/{sessionId}` as an `AuditionSession` document. The `AuditionSession` type includes:
- `status: 'in-progress' | 'completed' | 'cancelled'` — set at start, updated on end/cancel
- `startedAt` — ISO timestamp when the interview phase began
- `endedAt?` — ISO timestamp when the session ended or was cancelled
- `transcript` — array of `TranscriptEntry` (role, text, timestamp, isFinal)
- `score`, `feedback`, `strengths`, `improvements` — from the AI's `generate_feedback` tool call
- `ultraFeedback?` — optional extended analysis generated on demand

Sessions are written server-side via `/api/audition/sessions` (Firebase Admin SDK) as the authoritative path. A secondary client-side write via the Firestore SDK runs after for redundancy.

### API Routes

- `POST /api/audition/token` — Firebase-auth-gated. Returns `{ key, host }` — the Gemini API key and WebSocket host. No ephemeral token minting.
- `POST /api/audition/sessions` — Firebase-auth-gated. Accepts a full or partial `AuditionSession` and writes it to Firestore server-side using `merge: true`. Used for start (in-progress), end (completed), and cancel (cancelled) events.
- `POST /api/audition/ultra-feedback` — Generates extended post-interview analysis via Gemini Pro. Accepts the session transcript and initial feedback; returns a detailed markdown report. The client saves this back to the session document.

---

## Deployment

- **Platform**: Vercel
- **Workflow**: Commit changes to a GitHub branch and open a PR. The GitHub/Vercel integration automatically deploys the PR preview. Test the preview deployment, merge after review, wait for the production redeploy, then test the live site.
- **Environment variables required**:
  - `GEMINI_API_KEY` — fallback Gemini API key used when the user hasn't set their own in Settings
  - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Admin SDK credentials
  - Firebase client config vars (`NEXT_PUBLIC_FIREBASE_*`)
- `FIREBASE_PRIVATE_KEY` must have `\n` replaced with actual newlines in Vercel (the route handler does `.replace(/\\n/g, '\n')`)

### ⚠️ Local Dev Note: `.env.local` Has Placeholder Values

The `.env.local` file committed to this repo contains **placeholder values only** (e.g. `GEMINI_API_KEY=your_gemini_api_key_here`). The real secrets live exclusively in **Vercel's environment variable dashboard** and are never committed to git.

This means:
- Running `npm run dev` locally will work for UI/layout changes, but anything that hits a Gemini or Firebase API will fail with auth errors.
- **Do not try to debug API connectivity locally** using `.env.local` without first filling in real keys.
- To test the full audition flow, use the PR preview or production Vercel deployment where the real env vars are configured.
- If you need to run locally with real keys, copy the values from Vercel's dashboard into `.env.local` temporarily. **Never commit them.**

---

## Messaging System

The platform includes a real-time messaging system built on Firebase/Firestore that allows Job Seekers, Businesses, and Agencies to communicate.

### Architecture

The system uses a two-tier Firestore structure:
1. **`conversations` collection**: Stores metadata (participant IDs, latest message snippet, unread status). Used to quickly render the Inbox list without heavy reads.
2. **`conversations/{id}/messages` subcollection**: Stores individual message data.

**UI Implementation:**
- Messaging is implemented as a **global floating widget** (`ChatWidget.tsx`) residing at the bottom-right of the screen.
- State is managed globally via `MessagingContext` (`src/context/MessagingContext.tsx`), allowing any part of the app (like the "Message Recruiter" button on job pages) to seamlessly open the chat panel to a specific conversation.
- Standalone `/messages` routes were deliberately avoided in favor of this integrated contextual experience.

### Security Rules (Privacy)
A strict `firestore.rules` configuration enforces that:
- You must be explicitly listed in a conversation's `participantIds` array to read or write to it.
- You cannot read messages from a conversation you are not a part of.
*(See `firestore.rules` for exact implementation).*

### Rich Text & TipTap
To support rich text (bolding, lists, etc.) safely:
- We use **TipTap** (headless ProseMirror wrapper) as the editor (`RichTextEditor.tsx`).
- **What Worked:** Storing the TipTap document as a serialized JSON string in Firestore (e.g. `JSON.stringify(editor.getJSON())`) instead of raw HTML. This prevents XSS attacks and allows safe reconstruction on the receiving end.
- **Gotchas / What Didn't Work Initially:** TipTap uses standard HTML tags internally but requires Tailwind's Typography plugin to render them beautifully. If you try to style the editor using plain Tailwind utility classes, the nested lists and bold tags won't inherit proper styling. 
- **The Fix:** We installed `@tailwindcss/typography` and wrapped the editor and read-only message bubbles in the `prose prose-invert` classes. Always ensure the typography plugin is present in `tailwind.config.ts`.
