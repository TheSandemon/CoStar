export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { TranscriptEntry } from '@/lib/audition/types';
import { GEMINI_CONFIG } from '@/lib/audition/config';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

interface FeedbackRequest {
  transcript: TranscriptEntry[];
  jobTitle: string;
  companyName: string;
  focus?: string;
  difficulty: string;
}

interface FeedbackResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export async function POST(req: NextRequest) {
  try {
    // Resolve API key: prefer user's Firestore settings over env var
    const authHeader = req.headers.get('Authorization');
    let apiKey = process.env.GEMINI_API_KEY;
    const feedbackModel: string = GEMINI_CONFIG.feedbackModel;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const app = getAdminApp();
        const { uid } = await getAuth(app).verifyIdToken(authHeader.slice(7));
        const snap = await getFirestore(app).doc(`auditionSettings/${uid}`).get();
        if (snap.exists) {
          const data = snap.data() as Record<string, string>;
          if (data.geminiApiKey) apiKey = data.geminiApiKey;
        }
      } catch {
        // If token verification fails, fall through to env var
      }
    }

    const body = (await req.json()) as FeedbackRequest;
    const { transcript, jobTitle, companyName, focus, difficulty } = body;

    if (!transcript?.length) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const transcriptText = transcript
      .filter((e) => e.isFinal)
      .map((e) => {
        const text = e.text.replace(/INTERVIEW_COMPLETE/gi, '').trim();
        return text ? `${e.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${text}` : null;
      })
      .filter(Boolean)
      .join('\n');

    const focusLine = focus?.trim() ? ` focused on ${focus.trim()}` : '';
    const prompt = `You are an expert hiring manager reviewing a ${difficulty} interview${focusLine} for the role of "${jobTitle}"${companyName ? ` at "${companyName}"` : ''}.

INTERVIEW TRANSCRIPT:
${transcriptText}

Evaluate the candidate's performance and respond with ONLY valid JSON in this exact format:
{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentence overall summary of performance>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>", "<area 3>"]
}

Base the score on: communication clarity, technical accuracy (if applicable), relevance of answers, and confidence. Be honest and constructive.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${feedbackModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: GEMINI_CONFIG.feedbackTemperature },
        }),
      },
    );

    if (!res.ok) {
      console.error('[audition/feedback] Gemini error:', await res.text());
      return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 502 });
    }

    const geminiData = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const result = JSON.parse(raw) as FeedbackResult;

    return NextResponse.json(result);
  } catch (err) {
    console.error('[audition/feedback]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
