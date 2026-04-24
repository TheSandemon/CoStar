import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export type AccountType = 'user' | 'business' | 'agency';
export type SocialPlatform = 'github' | 'linkedin' | 'email';

export interface SocialConnection {
  platform: SocialPlatform;
  id: string;
  label?: string;
  url?: string;
  connected: boolean;
  connectedAt?: any;
}

export interface WorkVibe {
  style: string[];
  culture: string[];
  values: string;
}

export interface UserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role?: 'user' | 'business' | 'agency';
  accountType?: AccountType | null;
  headline?: string;
  location?: string;
  workVibe?: WorkVibe | null;
  socialConnections?: SocialConnection[];
  workExperience?: unknown[];
  education?: unknown[];
  accolades?: unknown[];
  profileComplete?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface ProfileChecklistItem {
  label: string;
  progress: number;
  complete: boolean;
}

export const emptyWorkVibe: WorkVibe = {
  style: [],
  culture: [],
  values: '',
};

export function normalizeProfile(uid: string, data: Partial<UserProfile> = {}): UserProfile {
  return {
    uid,
    email: data.email ?? null,
    displayName: data.displayName ?? '',
    photoURL: data.photoURL ?? null,
    role: data.role ?? 'user',
    accountType: data.accountType ?? null,
    headline: data.headline ?? '',
    location: data.location ?? '',
    workVibe: data.workVibe ?? emptyWorkVibe,
    socialConnections: data.socialConnections ?? [],
    workExperience: data.workExperience ?? [],
    education: data.education ?? [],
    accolades: data.accolades ?? [],
    profileComplete: data.profileComplete ?? 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function getSocialConnection(
  profile: Pick<UserProfile, 'socialConnections'> | null,
  platform: SocialPlatform
): SocialConnection | null {
  return profile?.socialConnections?.find((connection) => connection.platform === platform) ?? null;
}

export function upsertSocialConnection(
  connections: SocialConnection[] = [],
  next: SocialConnection
): SocialConnection[] {
  const withoutPlatform = connections.filter((connection) => connection.platform !== next.platform);
  return [...withoutPlatform, next];
}

export function buildProfileChecklist(profile: Partial<UserProfile> | null): ProfileChecklistItem[] {
  const workVibe = profile?.workVibe ?? emptyWorkVibe;
  const socialConnections = profile?.socialConnections ?? [];
  const hasBasicInfo = Boolean(profile?.displayName?.trim() && profile?.headline?.trim() && profile?.location?.trim());
  const hasWorkVibe = Boolean(
    workVibe.style.length > 0 &&
    workVibe.culture.length > 0 &&
    workVibe.values.trim()
  );

  return [
    { label: 'Basic Information', progress: hasBasicInfo ? 100 : 0, complete: hasBasicInfo },
    { label: 'Account Type', progress: profile?.accountType ? 100 : 0, complete: Boolean(profile?.accountType) },
    {
      label: 'Social Connections',
      progress: socialConnections.some((connection) => connection.connected) ? 100 : 0,
      complete: socialConnections.some((connection) => connection.connected),
    },
    { label: 'Work Vibe Assessment', progress: hasWorkVibe ? 100 : 0, complete: hasWorkVibe },
    {
      label: 'Work Experience',
      progress: (profile?.workExperience?.length ?? 0) > 0 ? 100 : 0,
      complete: (profile?.workExperience?.length ?? 0) > 0,
    },
    {
      label: 'Education',
      progress: (profile?.education?.length ?? 0) > 0 ? 100 : 0,
      complete: (profile?.education?.length ?? 0) > 0,
    },
  ];
}

export function calculateProfileComplete(profile: Partial<UserProfile> | null): number {
  const checklist = buildProfileChecklist(profile);
  const total = checklist.reduce((sum, item) => sum + item.progress, 0);
  return Math.round(total / checklist.length);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) throw new Error('Firestore not initialized');

  const profileRef = doc(db, 'users', uid);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) return null;

  const profile = normalizeProfile(uid, profileSnap.data() as Partial<UserProfile>);
  return {
    ...profile,
    profileComplete: calculateProfileComplete(profile),
  };
}

export async function saveUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const current = await getUserProfile(uid);
  const next = normalizeProfile(uid, {
    ...(current ?? {}),
    ...updates,
  });
  const profileComplete = calculateProfileComplete(next);
  const profileRef = doc(db, 'users', uid);

  if (current) {
    await updateDoc(profileRef, {
      ...updates,
      profileComplete,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await setDoc(profileRef, {
    ...next,
    profileComplete,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
