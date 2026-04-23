export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
    const liveModel = userSettings.liveModel || undefined;

    // Return the key + host so the client can connect directly via v1beta BidiGenerateContent.
    // The ephemeral token approach (BidiGenerateContentConstrained / v1alpha) does not support
    // gemini-3.1-flash-live-preview — it returns 1007 "token-based requests cannot use
    // project-scoped features". Firebase auth above ensures only authenticated users get the key.
    return NextResponse.json({ key: apiKey, host: liveApiHost, liveModel });
  } catch (err) {
    console.error('[audition/token]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
