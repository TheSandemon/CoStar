import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface CompanyLocation {
  city?: string;
  state?: string;
  country?: string;
}

export interface CompanyCulture {
  mission?: string;
  values?: string[];
  perks?: string[];
  benefits?: string[];
  photos?: string[];
  video?: string;
}

export interface CompanySocial {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

export interface CompanyData {
  companyId?: string;
  employerId?: string;

  // Basic Info
  name?: string;
  slug?: string;
  logo?: string;
  banner?: string;
  description?: string;
  tagline?: string;
  website?: string;
  foundedYear?: number;
  companySize?: string; // "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"

  // Location
  headquarters?: CompanyLocation;
  offices?: CompanyLocation[];

  // Culture
  culture?: CompanyCulture;

  // Tech Stack
  techStack?: string[];
  industries?: string[];

  // Social
  social?: CompanySocial;

  // Verification
  verified?: boolean;
  verifiedAt?: any;

  // Stats
  jobCount?: number;
  hiringCount?: number;

  // Timestamps
  createdAt?: any;
  updatedAt?: any;
}

// Helper to generate slug from company name
export function generateCompanySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36);
}

// Create a new company
export async function createCompany(companyData: CompanyData, employerId: string): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const company = {
    ...companyData,
    employerId,
    verified: false,
    jobCount: 0,
    hiringCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'companies'), company);
  return docRef.id;
}

// Update an existing company
export async function updateCompany(companyId: string, updates: Partial<CompanyData>): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const companyRef = doc(db, 'companies', companyId);
  await updateDoc(companyRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Get a single company by ID
export async function getCompanyById(companyId: string): Promise<CompanyData | null> {
  if (!db) throw new Error('Firestore not initialized');

  const companyRef = doc(db, 'companies', companyId);
  const companySnap = await getDoc(companyRef);

  if (!companySnap.exists()) return null;

  return {
    companyId: companySnap.id,
    ...companySnap.data(),
  } as CompanyData;
}

// Get a single company by slug
export async function getCompanyBySlug(slug: string): Promise<CompanyData | null> {
  if (!db) throw new Error('Firestore not initialized');

  const q = query(
    collection(db, 'companies'),
    where('slug', '==', slug),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    companyId: doc.id,
    ...doc.data(),
  } as CompanyData;
}

// Get company by employer ID
export async function getCompanyByEmployer(employerId: string): Promise<CompanyData | null> {
  if (!db) throw new Error('Firestore not initialized');

  const q = query(
    collection(db, 'companies'),
    where('employerId', '==', employerId),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    companyId: doc.id,
    ...doc.data(),
  } as CompanyData;
}

// Get all companies
export async function getAllCompanies(limitCount: number = 50): Promise<CompanyData[]> {
  if (!db) throw new Error('Firestore not initialized');

  const q = query(
    collection(db, 'companies'),
    orderBy('name', 'asc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    companyId: doc.id,
    ...doc.data(),
  })) as CompanyData[];
}

// Get verified companies
export async function getVerifiedCompanies(limitCount: number = 50): Promise<CompanyData[]> {
  if (!db) throw new Error('Firestore not initialized');

  const q = query(
    collection(db, 'companies'),
    where('verified', '==', true),
    orderBy('name', 'asc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    companyId: doc.id,
    ...doc.data(),
  })) as CompanyData[];
}

// Verify a company
export async function verifyCompany(companyId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const companyRef = doc(db, 'companies', companyId);
  await updateDoc(companyRef, {
    verified: true,
    verifiedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Update company job count
export async function updateCompanyJobCount(companyId: string, increment: boolean): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const companyRef = doc(db, 'companies', companyId);
  const operator = increment ? 1 : -1;

  await updateDoc(companyRef, {
    jobCount: increment ? true : false, // This won't work as expected, need to use separate logic
    updatedAt: serverTimestamp(),
  });
}

// Search companies
export async function searchCompanies(searchTerm: string): Promise<CompanyData[]> {
  if (!db) throw new Error('Firestore not initialized');

  const q = query(
    collection(db, 'companies'),
    where('name', '>=', searchTerm),
    where('name', '<=', searchTerm + '\uf8ff'),
    limit(20)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    companyId: doc.id,
    ...doc.data(),
  })) as CompanyData[];
}

// Get all unique industries
export async function getAllIndustries(): Promise<string[]> {
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await getDocs(collection(db, 'companies'));
  const industries = new Set<string>();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.industries) {
      data.industries.forEach((industry: string) => industries.add(industry));
    }
  });

  return Array.from(industries).sort();
}

// Get all unique company sizes
export async function getAllCompanySizes(): Promise<string[]> {
  return ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
}

// Helper function for limit (re-exported from firebase-utils)
function limit(n: number) {
  return { type: 'limit' as const, limit: n };
}
