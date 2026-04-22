export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GEMINI_CONFIG } from '@/lib/audition/config';
import { getAuth } from 'firebase-admin/auth';

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

export async function POST(req: NextRequest) {
  try {
    // Verify Firebase ID token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);

    const app = getAdminApp();
    const { uid } = await getAuth(app).verifyIdToken(idToken);

    // Read user's Gemini settings from Firestore; fall back to env var
    const settingsSnap = await getFirestore(app).doc(`auditionSettings/${uid}`).get();
    const userSettings = settingsSnap.exists ? (settingsSnap.data() as Record<string, string>) : {};

    const apiKey = userSettings.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Gemini API key configured. Open Audition settings to add one.' },
        { status: 500 },
      );
    }

    const liveApiHost = userSettings.liveApiHost || 'generativelanguage.googleapis.com';

    // Mint ephemeral token via Gemini REST API
    const expireTime = new Date(Date.now() + GEMINI_CONFIG.tokenTtlMs).toISOString();
    const res = await fetch(
      `https://${liveApiHost}/v1alpha/ephemeralTokens?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            use: 1,
            expire_time: expireTime,
            new_session_expire_time: new Date(Date.now() + GEMINI_CONFIG.sessionTtlMs).toISOString(),
          },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[audition/token] Gemini token error:', err);
      return NextResponse.json({ error: 'Failed to mint token' }, { status: 502 });
    }

    const data = (await res.json()) as { name?: string };
    return NextResponse.json({ token: data.name, expiresAt: expireTime });
  } catch (err) {
    console.error('[audition/token]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
