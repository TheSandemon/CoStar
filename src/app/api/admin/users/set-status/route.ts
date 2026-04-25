export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, jsonError, requireAdmin } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { db } = await requireAdmin(req);
    const body = await req.json();
    const uid = String(body.uid ?? '');
    const moderationStatus = body.moderationStatus as 'active' | 'suspended' | undefined;
    const publicProfileEnabled = typeof body.publicProfileEnabled === 'boolean'
      ? body.publicProfileEnabled
      : undefined;

    if (!uid) {
      return NextResponse.json({ error: 'User uid is required.' }, { status: 400 });
    }
    if (moderationStatus && !['active', 'suspended'].includes(moderationStatus)) {
      return NextResponse.json({ error: 'Invalid moderation status.' }, { status: 400 });
    }

    const userRef = db.doc(`users/${uid}`);
    const snap = await userRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const data = snap.data() ?? {};
    if (data.accountType === 'owner') {
      return NextResponse.json({ error: 'Owner account cannot be moderated from the admin UI.' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (moderationStatus) {
      updates.moderationStatus = moderationStatus;
      updates.disabled = moderationStatus === 'suspended';
      await getAuth(getAdminApp()).updateUser(uid, { disabled: moderationStatus === 'suspended' });
    }

    if (typeof publicProfileEnabled === 'boolean') {
      updates.publicProfileEnabled = publicProfileEnabled;
    }

    await userRef.update(updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
