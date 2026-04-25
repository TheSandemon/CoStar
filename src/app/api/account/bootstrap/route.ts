export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
  getAdminDb,
  isOwnerEmail,
  jsonError,
  normalizeAdminEmail,
  verifyBearerToken,
} from '@/lib/firebaseAdmin';
import type { AccountType } from '@/lib/profile';

const publicAccountTypes: AccountType[] = ['user', 'business', 'agency'];

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyBearerToken(req);
    const body = await req.json().catch(() => ({}));
    const requestedType = publicAccountTypes.includes(body?.requestedType) ? body.requestedType as AccountType : null;
    const db = getAdminDb();
    const userRef = db.doc(`users/${decoded.uid}`);
    const snap = await userRef.get();
    const existing = snap.exists ? snap.data() ?? {} : {};
    const email = normalizeAdminEmail(decoded.email);
    const now = FieldValue.serverTimestamp();
    const forcedOwner = isOwnerEmail(email);
    const nextAccountType: AccountType | null = forcedOwner
      ? 'owner'
      : existing.accountType ?? requestedType ?? null;

    const baseData = {
      uid: decoded.uid,
      email: decoded.email ?? existing.email ?? null,
      emailNormalized: email || existing.emailNormalized || null,
      displayName: existing.displayName ?? decoded.name ?? decoded.email ?? '',
      photoURL: existing.photoURL ?? decoded.picture ?? null,
      updatedAt: now,
    };

    const accountData = nextAccountType ? {
      accountType: nextAccountType,
      role: nextAccountType,
      accountTypeLocked: true,
      accountTypeLockedAt: existing.accountTypeLockedAt ?? now,
      accountTypeSource: forcedOwner ? 'system' : existing.accountTypeSource ?? 'signup',
      moderationStatus: existing.moderationStatus ?? 'active',
      disabled: false,
    } : {
      accountType: null,
      role: 'user',
      accountTypeLocked: false,
      moderationStatus: existing.moderationStatus ?? 'active',
      disabled: false,
    };

    if (snap.exists) {
      await userRef.update({ ...baseData, ...accountData });
    } else {
      await userRef.set({
        ...baseData,
        ...accountData,
        publicProfileEnabled: true,
        socialConnections: [],
        workExperience: [],
        education: [],
        accolades: [],
        createdAt: now,
      });
    }

    const updated = await userRef.get();
    return NextResponse.json({ uid: decoded.uid, ...updated.data() });
  } catch (err) {
    return jsonError(err);
  }
}
