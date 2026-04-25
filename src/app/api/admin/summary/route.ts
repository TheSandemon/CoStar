export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireAdmin } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const { db } = await requireAdmin(req);
    const [usersSnap, jobsSnap, scrapedJobsSnap] = await Promise.all([
      db.collection('users').orderBy('updatedAt', 'desc').limit(50).get(),
      db.collection('jobs').get(),
      db.collection('scrapedJobs').get(),
    ]);

    const allUsersSnap = await db.collection('users').get();
    const counts = {
      totalUsers: allUsersSnap.size,
      user: 0,
      business: 0,
      agency: 0,
      admin: 0,
      owner: 0,
      suspended: 0,
      jobs: jobsSnap.size,
      scrapedJobs: scrapedJobsSnap.size,
    };

    allUsersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.accountType && data.accountType in counts) {
        counts[data.accountType as 'user'] += 1;
      }
      if (data.moderationStatus === 'suspended' || data.disabled === true) {
        counts.suspended += 1;
      }
    });

    const recentUsers = usersSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email ?? null,
        displayName: data.displayName ?? '',
        accountType: data.accountType ?? null,
        accountTypeLocked: Boolean(data.accountTypeLocked),
        publicProfileEnabled: data.publicProfileEnabled !== false,
        moderationStatus: data.moderationStatus ?? 'active',
        disabled: Boolean(data.disabled),
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      };
    });

    return NextResponse.json({ counts, recentUsers });
  } catch (err) {
    return jsonError(err);
  }
}

function serializeTimestamp(value: any): string | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
