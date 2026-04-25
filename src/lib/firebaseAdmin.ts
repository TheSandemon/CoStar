import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { AccountType } from './profile';

export const OWNER_EMAIL = 'kyletouchet@gmail.com';

export function normalizeAdminEmail(email?: string | null): string {
  return email?.trim().toLowerCase() ?? '';
}

export function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials in environment variables.');
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export async function verifyBearerToken(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  return getAuth(getAdminApp()).verifyIdToken(authHeader.slice(7));
}

export async function getCallerProfile(req: Request) {
  const decoded = await verifyBearerToken(req);
  const db = getAdminDb();
  const snap = await db.doc(`users/${decoded.uid}`).get();
  const profile = snap.exists ? snap.data() : null;
  return { decoded, profile, db };
}

export function isPrivilegedType(accountType?: unknown): accountType is 'admin' | 'owner' {
  const normalized = normalizeAccountType(accountType);
  return normalized === 'admin' || normalized === 'owner';
}

export function isOwnerEmail(email?: string | null): boolean {
  return normalizeAdminEmail(email) === OWNER_EMAIL;
}

export async function requireAdmin(req: Request) {
  const caller = await getCallerProfile(req);
  if (!isPrivilegedType(caller.profile?.accountType)) {
    throw new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  return caller;
}

export async function requireOwner(req: Request) {
  const caller = await requireAdmin(req);
  if (caller.profile?.accountType !== 'owner') {
    throw new Response(JSON.stringify({ error: 'Owner access required' }), { status: 403 });
  }
  return caller;
}

export function assertAccountType(value: unknown): asserts value is AccountType {
  if (!normalizeAccountType(value)) {
    throw new Response(JSON.stringify({ error: 'Invalid account type' }), { status: 400 });
  }
}

function normalizeAccountType(value: unknown): AccountType | null {
  if (value === 'user') return 'talent';
  if (['talent', 'business', 'agency', 'admin', 'owner'].includes(String(value))) {
    return value as AccountType;
  }
  return null;
}

export function jsonError(err: unknown) {
  if (err instanceof Response) return err;
  console.error('[admin/api]', err);
  return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
    status: 500,
  });
}
