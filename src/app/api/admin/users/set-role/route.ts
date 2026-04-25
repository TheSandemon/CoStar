export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { jsonError, normalizeAdminEmail, requireOwner } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { db } = await requireOwner(req);
    const body = await req.json();
    const email = normalizeAdminEmail(body.email);
    const action = body.action as 'promote-admin' | 'demote-admin';

    if (!email || !['promote-admin', 'demote-admin'].includes(action)) {
      return NextResponse.json({ error: 'Email and valid action are required.' }, { status: 400 });
    }

    const snap = await db.collection('users').where('emailNormalized', '==', email).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: 'No user found for that email.' }, { status: 404 });
    }

    const userDoc = snap.docs[0];
    const data = userDoc.data();
    if (data.accountType === 'owner') {
      return NextResponse.json({ error: 'Owner role cannot be changed from the admin UI.' }, { status: 400 });
    }

    const nextType = action === 'promote-admin' ? 'admin' : 'talent';
    if (action === 'demote-admin' && data.accountType !== 'admin') {
      return NextResponse.json({ error: 'Only admin accounts can be demoted with this action.' }, { status: 400 });
    }

    await userDoc.ref.update({
      accountType: nextType,
      role: nextType,
      accountTypeLocked: true,
      accountTypeLockedAt: data.accountTypeLockedAt ?? FieldValue.serverTimestamp(),
      accountTypeSource: action === 'promote-admin' ? 'system' : data.accountTypeSource ?? 'system',
      moderationStatus: data.moderationStatus ?? 'active',
      disabled: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, uid: userDoc.id, accountType: nextType });
  } catch (err) {
    return jsonError(err);
  }
}
