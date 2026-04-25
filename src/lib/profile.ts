import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export type AccountType = 'user' | 'business' | 'agency' | 'admin' | 'owner';
export type SocialPlatform = 'github' | 'linkedin' | 'email';
export type AccountTypeSource = 'signup' | 'legacy' | 'migration' | 'system';

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
  emailNormalized?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role?: AccountType;
  accountType?: AccountType | null;
  accountTypeLocked?: boolean;
  accountTypeLockedAt?: any;
  accountTypeSource?: AccountTypeSource;
  headline?: string;
  location?: string;
  slug?: string;
  publicProfileEnabled?: boolean;
  workVibe?: WorkVibe | null;
  socialConnections?: SocialConnection[];
  workExperience?: unknown[];
  education?: unknown[];
  accolades?: unknown[];
  jobPreferences?: Record<string, unknown>;
  businessProfile?: BusinessProfile | null;
  agencyProfile?: AgencyProfile | null;
  profileComplete?: number;
  moderationStatus?: 'active' | 'suspended';
  disabled?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface BusinessProfile {
  companyId?: string;
  companyName?: string;
  website?: string;
  companySize?: string;
  description?: string;
  headquarters?: {
    city?: string;
    state?: string;
    country?: string;
  };
  culture?: {
    values?: string;
    tags?: string[];
  };
  hiringGoals?: string;
}

export interface AgencyProfile {
  agencyName?: string;
  website?: string;
  description?: string;
  location?: string;
  specialties?: string[];
  industries?: string[];
  services?: string[];
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

export const accountTypeLabels: Record<AccountType, string> = {
  user: 'Job Seeker',
  business: 'Employer',
  agency: 'Agency',
  admin: 'Admin',
  owner: 'Owner',
};

export const accountTypes: AccountType[] = ['user', 'business', 'agency', 'admin', 'owner'];
export const publicSignupAccountTypes: AccountType[] = ['user', 'business', 'agency'];
export const privilegedAccountTypes: AccountType[] = ['admin', 'owner'];

export function isAccountType(value: unknown): value is AccountType {
  return typeof value === 'string' && accountTypes.includes(value as AccountType);
}

export function normalizeEmail(email?: string | null): string | null {
  return email?.trim().toLowerCase() || null;
}

export function createSlug(value?: string | null, fallback?: string): string {
  const base = (value || fallback || 'profile')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return base || 'profile';
}

export function normalizeProfile(uid: string, data: Partial<UserProfile> = {}): UserProfile {
  const accountType = data.accountType ?? null;
  return {
    uid,
    email: data.email ?? null,
    emailNormalized: data.emailNormalized ?? normalizeEmail(data.email),
    displayName: data.displayName ?? '',
    photoURL: data.photoURL ?? null,
    role: data.role ?? accountType ?? 'user',
    accountType,
    accountTypeLocked: data.accountTypeLocked ?? Boolean(accountType),
    accountTypeLockedAt: data.accountTypeLockedAt,
    accountTypeSource: data.accountTypeSource,
    headline: data.headline ?? '',
    location: data.location ?? '',
    slug: data.slug ?? createSlug(data.displayName ?? data.email ?? uid, uid),
    publicProfileEnabled: data.publicProfileEnabled ?? true,
    workVibe: data.workVibe ?? emptyWorkVibe,
    socialConnections: data.socialConnections ?? [],
    workExperience: data.workExperience ?? [],
    education: data.education ?? [],
    accolades: data.accolades ?? [],
    jobPreferences: data.jobPreferences ?? {},
    businessProfile: data.businessProfile ?? null,
    agencyProfile: data.agencyProfile ?? null,
    profileComplete: data.profileComplete ?? 0,
    moderationStatus: data.moderationStatus ?? 'active',
    disabled: data.disabled ?? false,
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
  const accountType = profile?.accountType ?? null;
  if (accountType === 'business') return buildBusinessChecklist(profile);
  if (accountType === 'agency') return buildAgencyChecklist(profile);

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

function buildBusinessChecklist(profile: Partial<UserProfile> | null): ProfileChecklistItem[] {
  const business = profile?.businessProfile ?? null;
  const headquarters = business?.headquarters;

  return [
    {
      label: 'Account Type',
      progress: profile?.accountType === 'business' ? 100 : 0,
      complete: profile?.accountType === 'business',
    },
    {
      label: 'Representative Info',
      progress: profile?.displayName?.trim() && profile?.email ? 100 : 0,
      complete: Boolean(profile?.displayName?.trim() && profile?.email),
    },
    {
      label: 'Company Basics',
      progress: business?.companyName?.trim() && business?.website?.trim() ? 100 : 0,
      complete: Boolean(business?.companyName?.trim() && business?.website?.trim()),
    },
    {
      label: 'Company Location',
      progress: headquarters?.city?.trim() || headquarters?.country?.trim() ? 100 : 0,
      complete: Boolean(headquarters?.city?.trim() || headquarters?.country?.trim()),
    },
    {
      label: 'Culture & Hiring Goals',
      progress: business?.description?.trim() || business?.hiringGoals?.trim() ? 100 : 0,
      complete: Boolean(business?.description?.trim() || business?.hiringGoals?.trim()),
    },
  ];
}

function buildAgencyChecklist(profile: Partial<UserProfile> | null): ProfileChecklistItem[] {
  const agency = profile?.agencyProfile ?? null;

  return [
    {
      label: 'Account Type',
      progress: profile?.accountType === 'agency' ? 100 : 0,
      complete: profile?.accountType === 'agency',
    },
    {
      label: 'Representative Info',
      progress: profile?.displayName?.trim() && profile?.email ? 100 : 0,
      complete: Boolean(profile?.displayName?.trim() && profile?.email),
    },
    {
      label: 'Agency Basics',
      progress: agency?.agencyName?.trim() && agency?.description?.trim() ? 100 : 0,
      complete: Boolean(agency?.agencyName?.trim() && agency?.description?.trim()),
    },
    {
      label: 'Services',
      progress: (agency?.services?.length ?? 0) > 0 ? 100 : 0,
      complete: (agency?.services?.length ?? 0) > 0,
    },
    {
      label: 'Specialties',
      progress: (agency?.specialties?.length ?? 0) > 0 || (agency?.industries?.length ?? 0) > 0 ? 100 : 0,
      complete: (agency?.specialties?.length ?? 0) > 0 || (agency?.industries?.length ?? 0) > 0,
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

export async function getPublicProfileBySlugOrUid(
  slugOrUid: string,
  accountType?: AccountType
): Promise<UserProfile | null> {
  if (!db) throw new Error('Firestore not initialized');

  const directSnap = await getDoc(doc(db, 'users', slugOrUid));
  if (directSnap.exists()) {
    const directProfile = normalizeProfile(directSnap.id, directSnap.data() as Partial<UserProfile>);
    if (
      directProfile.publicProfileEnabled &&
      (!accountType || directProfile.accountType === accountType)
    ) {
      return directProfile;
    }
  }

  const snapshot = await getDocs(query(
    collection(db, 'users'),
    where('slug', '==', slugOrUid),
    limit(5)
  ));
  if (snapshot.empty) return null;

  const profileSnap = snapshot.docs.find((docSnap) => {
    const data = docSnap.data() as Partial<UserProfile>;
    return data.publicProfileEnabled !== false && (!accountType || data.accountType === accountType);
  });
  if (!profileSnap) return null;

  return normalizeProfile(profileSnap.id, profileSnap.data() as Partial<UserProfile>);
}

export async function saveUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const current = await getUserProfile(uid);
  if (current?.accountTypeLocked && updates.accountType && updates.accountType !== current.accountType) {
    throw new Error('Account type is locked for this account.');
  }

  const next = normalizeProfile(uid, {
    ...(current ?? {}),
    ...updates,
    role: updates.accountType ?? updates.role ?? current?.role,
    emailNormalized: updates.emailNormalized ?? normalizeEmail(updates.email ?? current?.email),
  });
  const profileComplete = calculateProfileComplete(next);
  const profileRef = doc(db, 'users', uid);

  if (current) {
    const protectedUpdates = { ...updates };
    if (current.accountTypeLocked) {
      delete protectedUpdates.accountType;
      delete protectedUpdates.accountTypeLocked;
      delete protectedUpdates.accountTypeLockedAt;
      delete protectedUpdates.accountTypeSource;
      delete protectedUpdates.role;
    }

    await updateDoc(profileRef, {
      ...protectedUpdates,
      emailNormalized: protectedUpdates.emailNormalized ?? normalizeEmail(protectedUpdates.email ?? current.email),
      profileComplete,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await setDoc(profileRef, {
    ...next,
    accountTypeLocked: Boolean(next.accountType),
    accountTypeLockedAt: next.accountType ? serverTimestamp() : null,
    accountTypeSource: next.accountType ? next.accountTypeSource ?? 'signup' : null,
    profileComplete,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createOrSyncUserProfileFromAuth(
  authUser: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
  },
  requestedType?: AccountType | null
): Promise<UserProfile> {
  if (!db) throw new Error('Firestore not initialized');

  const existing = await getUserProfile(authUser.uid);
  const profileRef = doc(db, 'users', authUser.uid);
  const authFields = {
    uid: authUser.uid,
    email: authUser.email ?? null,
    emailNormalized: normalizeEmail(authUser.email),
    displayName: existing?.displayName || authUser.displayName || '',
    photoURL: authUser.photoURL ?? null,
    slug: existing?.slug ?? createSlug(authUser.displayName ?? authUser.email, authUser.uid),
  };

  if (existing) {
    const updates: Partial<UserProfile> = {
      ...authFields,
      updatedAt: serverTimestamp(),
    };

    if (existing.accountType && !existing.accountTypeLocked) {
      updates.accountTypeLocked = true;
      updates.accountTypeLockedAt = serverTimestamp();
      updates.accountTypeSource = existing.accountTypeSource ?? 'legacy';
      updates.role = existing.accountType;
    } else if (!existing.accountType && requestedType) {
      updates.accountType = requestedType;
      updates.role = requestedType;
      updates.accountTypeLocked = true;
      updates.accountTypeLockedAt = serverTimestamp();
      updates.accountTypeSource = 'signup';
    }

    await updateDoc(profileRef, updates);
    return normalizeProfile(authUser.uid, { ...existing, ...updates });
  }

  const next = normalizeProfile(authUser.uid, {
    ...authFields,
    accountType: requestedType ?? null,
    role: requestedType ?? 'user',
    accountTypeLocked: Boolean(requestedType),
    accountTypeSource: requestedType ? 'signup' : undefined,
  });

  await setDoc(profileRef, {
    ...next,
    accountTypeLockedAt: requestedType ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return next;
}

export async function lockAccountType(
  uid: string,
  accountType: AccountType,
  source: AccountTypeSource = 'signup'
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const current = await getUserProfile(uid);
  if (current?.accountTypeLocked && current.accountType && current.accountType !== accountType) {
    throw new Error('Account type is locked for this account.');
  }

  const profileRef = doc(db, 'users', uid);
  await updateDoc(profileRef, {
    accountType,
    role: accountType,
    accountTypeLocked: true,
    accountTypeLockedAt: current?.accountTypeLockedAt ?? serverTimestamp(),
    accountTypeSource: current?.accountTypeSource ?? source,
    profileComplete: calculateProfileComplete({ ...(current ?? {}), accountType, role: accountType }),
    updatedAt: serverTimestamp(),
  });
}

export async function saveTypeSpecificProfile(
  uid: string,
  accountType: AccountType,
  updates: Partial<UserProfile>
): Promise<void> {
  const current = await getUserProfile(uid);
  if (current?.accountType && current.accountType !== accountType) {
    throw new Error('Cannot save profile data for a different account type.');
  }

  await saveUserProfile(uid, {
    ...updates,
    accountType: current?.accountType ?? accountType,
    role: current?.accountType ?? accountType,
  });
}

export function getCurrentAccountPath(profile: Partial<UserProfile> | null | undefined): AccountType | null {
  return profile?.accountType ?? null;
}
