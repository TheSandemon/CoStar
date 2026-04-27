import { NextResponse } from 'next/server';
import { verifyBearerToken, getAdminDb, jsonError } from '@/lib/firebaseAdmin';
import { stripUndefinedFields } from '@/lib/audition/sessionSerialization';
import type { AuditionSession } from '@/lib/audition/types';

export async function POST(req: Request) {
  try {
    const decoded = await verifyBearerToken(req);
    const body = (await req.json()) as Partial<AuditionSession>;

    if (!body.id) {
      return NextResponse.json({ error: 'Missing session id' }, { status: 400 });
    }

    // Ensure the session belongs to the authenticated user
    if (body.userId && body.userId !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    const sessionPatch = stripUndefinedFields({ ...body, userId: decoded.uid });
    await db
      .doc(`auditionSessions/${decoded.uid}/sessions/${body.id}`)
      .set(sessionPatch, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
