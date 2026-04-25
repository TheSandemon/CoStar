export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { TranscriptEntry } from '@/lib/audition/types';

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

interface UltraFeedbackRequest {
  sessionId: string;
  transcript: TranscriptEntry[];
  jobTitle: string;
  companyName: string;
  focus?: string;
  difficulty: string;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    let apiKey = process.env.GEMINI_API_KEY;

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
        // fall through to env var
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key available' }, { status: 500 });
    }

    const body = (await req.json()) as UltraFeedbackRequest;
    const { transcript, jobTitle, companyName, focus, difficulty, score, feedback, strengths, improvements } = body;

    if (!transcript?.length) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    const transcriptText = transcript
      .filter((e) => e.isFinal)
      .map((e) => {
        const text = e.text.replace(/INTERVIEW_COMPLETE/gi, '').trim();
        return text ? `${e.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${text}` : null;
      })
      .filter(Boolean)
      .join('\n');

    const focusLine = focus?.trim() ? ` with a focus on ${focus.trim()}` : '';
    const companyLine = companyName ? ` at ${companyName}` : '';

    const prompt = `You are a world-class executive career coach and senior hiring consultant. A candidate just completed a ${difficulty}-difficulty mock interview${focusLine} for the role of "${jobTitle}"${companyLine}.

INTERVIEW SCORE: ${score}/100
STANDARD FEEDBACK: ${feedback}
STRENGTHS IDENTIFIED: ${strengths.join(', ') || 'None noted'}
AREAS TO IMPROVE: ${improvements.join(', ') || 'None noted'}

FULL INTERVIEW TRANSCRIPT:
${transcriptText}

Provide an ultra-detailed, executive-grade analysis of this candidate's performance. Your analysis must be substantive, specific to what was actually said in the transcript, and actionable. Structure your response in markdown with the following sections:

## Executive Performance Summary
A 3–4 paragraph narrative assessment of the candidate's overall performance, their readiness for this role, and what distinguishes them from average candidates.

## Communication Analysis
Evaluate communication effectiveness: clarity of expression, logical structure of answers, vocabulary appropriateness, ability to be concise vs. verbose, and any notable patterns (hedging, filler language, confidence signals).

## Question-by-Question Breakdown
For each question asked, briefly assess the quality of the response (what worked, what was missing, what a strong answer would have included).

## Domain & Technical Knowledge
Assessment of the candidate's demonstrated knowledge relevant to the role and difficulty level. Note any gaps, surface-level answers, or impressive depth.

## Behavioral Competency Signals
Evaluate use of concrete examples, storytelling ability, STAR framework usage, and how well the candidate demonstrated past impact vs. vague generalities.

## Competitive Positioning
How does this candidate compare to what a top-performing applicant would look like for this specific role? Be direct about where they stand.

## 30/60/90-Day Improvement Roadmap
A structured plan with specific, actionable steps the candidate can take in the next 30, 60, and 90 days to significantly improve their interview performance for this type of role.

## Top 3 Power Moves
The three highest-leverage tactics this candidate should implement immediately in their next interview to make the strongest possible impression.

Be direct, honest, and specific. Generic advice is not acceptable — every recommendation must be grounded in what this candidate actually said or failed to say in this interview.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 },
        }),
      },
    );

    if (!res.ok) {
      console.error('[ultra-feedback] Gemini error:', await res.text());
      return NextResponse.json({ error: 'Failed to generate ultra feedback' }, { status: 502 });
    }

    const geminiData = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const ultraFeedback = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!ultraFeedback) {
      return NextResponse.json({ error: 'Empty response from model' }, { status: 502 });
    }

    return NextResponse.json({ ultraFeedback });
  } catch (err) {
    console.error('[ultra-feedback]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
