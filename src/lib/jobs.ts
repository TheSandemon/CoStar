import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  increment,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';

export interface JobLocation {
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  remotePolicy?: 'remote' | 'hybrid' | 'onsite' | 'flexible';
  remoteNotes?: string;
  address?: string;
}

export interface SalaryRange {
  min?: number;
  max?: number;
  currency?: string;
  period?: 'hourly' | 'monthly' | 'yearly';
  visible?: boolean;
  bonus?: {
    min?: number;
    max?: number;
    currency?: string;
    type?: 'annual' | 'signing' | 'performance';
  };
  equity?: {
    min?: number;
    max?: number;
    unit?: 'shares' | 'percentage';
    vesting?: string;
  };
}

export interface EmploymentDetails {
  type?: 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary' | 'freelance';
  duration?: string;
  startDate?: Date;
  endDate?: Date;
  urgency?: 'immediate' | 'within_30_days' | 'flexible';
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead' | 'director' | 'executive';
}

export interface LanguageProficiency {
  language: string;
  proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
}

export interface Skills {
  required?: string[];
  preferred?: string[];
  tools?: string[];
  certifications?: string[];
  languages?: LanguageProficiency[];
}

export interface EducationRequirement {
  level?: 'high_school' | 'associate' | 'bachelor' | 'master' | 'phd' | 'md' | 'jd';
  field?: string;
  major?: string;
  required?: boolean;
  preferred?: boolean;
}

export interface Experience {
  yearsMin?: number;
  yearsMax?: number;
  domains?: string[];
  roles?: string[];
}

export interface VibeMatch {
  workStyle?: string[];
  culture?: string[];
  values?: string;
  perks?: string[];
  benefits?: string[];
}

export interface ApplicationProcess {
  method?: 'platform' | 'email' | 'external' | 'referral';
  email?: string;
  url?: string;
  requiredFields?: string[];
  resumeRequired?: boolean;
  coverLetterRequired?: boolean;
  portfolioRequired?: boolean;
  questions?: string[];
}

export interface Screening {
  stages?: string[];
  assessmentType?: 'code' | 'case_study' | 'presentation' | 'none';
  assessmentDuration?: number;
  interviewRounds?: number;
}

export interface JobMetrics {
  views?: number;
  uniqueViews?: number;
  applications?: number;
  saves?: number;
  shares?: number;
  avgTimeToApply?: number;
}

export interface JobData {
  // Identification
  jobId?: string;
  companyId?: string;
  companyName?: string;
  employerId?: string;

  // Basic Info
  title?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;

  // Location & Work Type
  location?: JobLocation;

  // Compensation
  salary?: SalaryRange;

  // Employment Details
  employment?: EmploymentDetails;

  // Skills & Requirements
  skills?: Skills;

  // Education Requirements
  education?: EducationRequirement[];

  // Experience Requirements
  experience?: Experience;

  // Work Vibe
  vibeMatch?: VibeMatch;

  // Application Process
  application?: ApplicationProcess;

  // Screening
  screening?: Screening;

  // Status & Metadata
  status?: 'draft' | 'active' | 'paused' | 'closed' | 'filled';
  visibility?: 'public' | 'private' | 'unlisted';

  // SEO & Display
  category?: string;
  tags?: string[];

  // Metrics
  metrics?: JobMetrics;

  // Timestamps
  createdAt?: any;
  updatedAt?: any;
  publishedAt?: any;
  expiresAt?: any;
  closedAt?: any;
}

export interface JobFilters {
  search?: string;
  location?: {
    city?: string;
    country?: string;
  };
  remotePolicy?: string[];
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: string[];
  employmentType?: string[];
  category?: string;
  companySize?: string[];
  datePosted?: '24h' | 'week' | 'month' | 'any';
  tags?: string[];
  employerId?: string;
  companyId?: string;
}

export type SortOption = 'recent' | 'salary_high' | 'salary_low' | 'company_az' | 'most_viewed' | 'relevance';

// Helper to generate slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36);
}

// Create a new job
export async function createJob(jobData: JobData, employerId: string): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const job = {
    ...jobData,
    employerId,
    status: jobData.status || 'draft',
    visibility: jobData.visibility || 'public',
    metrics: {
      views: 0,
      uniqueViews: 0,
      applications: 0,
      saves: 0,
      shares: 0,
      avgTimeToApply: 0,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'jobs'), job);
  return docRef.id;
}

// Update an existing job
export async function updateJob(jobId: string, updates: Partial<JobData>): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const jobRef = doc(db, 'jobs', jobId);
  await updateDoc(jobRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Soft delete a job (mark as closed)
export async function deleteJob(jobId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const jobRef = doc(db, 'jobs', jobId);
  await updateDoc(jobRef, {
    status: 'closed',
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Get a single job by ID
export async function getJobById(jobId: string): Promise<JobData | null> {
  if (!db) throw new Error('Firestore not initialized');

  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) return null;

  return {
    jobId: jobSnap.id,
    ...jobSnap.data(),
  } as JobData;
}

// Get a single job by slug
export async function getJobBySlug(slug: string): Promise<JobData | null> {
  if (!db) throw new Error('Firestore not initialized');

  const q = query(
    collection(db, 'jobs'),
    where('slug', '==', slug),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    jobId: doc.id,
    ...doc.data(),
  } as JobData;
}

// Get jobs with filters and sorting
export async function getJobs(
  filters: JobFilters = {},
  sortBy: SortOption = 'recent',
  pageSize: number = 20,
  lastDoc?: any
): Promise<{ jobs: JobData[]; lastDocument: any; hasMore: boolean }> {
  if (!db) throw new Error('Firestore not initialized');

  const constraints: QueryConstraint[] = [];

  // Always filter by active status for public listing
  constraints.push(where('status', '==', 'active'));
  constraints.push(where('visibility', 'in', ['public', 'unlisted']));

  // Apply filters
  if (filters.employmentType && filters.employmentType.length > 0) {
    constraints.push(where('employment.type', 'in', filters.employmentType));
  }

  if (filters.experienceLevel && filters.experienceLevel.length > 0) {
    constraints.push(where('employment.experienceLevel', 'in', filters.experienceLevel));
  }

  if (filters.category) {
    constraints.push(where('category', '==', filters.category));
  }

  if (filters.employerId) {
    constraints.push(where('employerId', '==', filters.employerId));
  }

  if (filters.companyId) {
    constraints.push(where('companyId', '==', filters.companyId));
  }

  // Apply sorting
  switch (sortBy) {
    case 'recent':
      constraints.push(orderBy('createdAt', 'desc'));
      break;
    case 'salary_high':
      constraints.push(orderBy('salary.max', 'desc'));
      break;
    case 'salary_low':
      constraints.push(orderBy('salary.min', 'asc'));
      break;
    case 'company_az':
      constraints.push(orderBy('companyName', 'asc'));
      break;
    case 'most_viewed':
      constraints.push(orderBy('metrics.views', 'desc'));
      break;
  }

  // Pagination
  constraints.push(limit(pageSize));
  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, 'jobs'), ...constraints);
  const snapshot = await getDocs(q);

  const jobs: JobData[] = snapshot.docs.map(doc => ({
    jobId: doc.id,
    ...doc.data(),
  })) as JobData[];

  // Client-side filtering for text search and salary range
  let filteredJobs = jobs;

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredJobs = filteredJobs.filter(job =>
      job.title?.toLowerCase().includes(searchLower) ||
      job.companyName?.toLowerCase().includes(searchLower) ||
      job.description?.toLowerCase().includes(searchLower) ||
      job.shortDescription?.toLowerCase().includes(searchLower) ||
      job.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
      job.skills?.required?.some(skill => skill.toLowerCase().includes(searchLower)) ||
      job.skills?.preferred?.some(skill => skill.toLowerCase().includes(searchLower))
    );
  }

  if (filters.remotePolicy && filters.remotePolicy.length > 0) {
    filteredJobs = filteredJobs.filter(job =>
      job.location?.remotePolicy && (filters.remotePolicy ?? []).includes(job.location.remotePolicy)
    );
  }

  if (filters.salaryMin) {
    filteredJobs = filteredJobs.filter(job =>
      job.salary?.max && job.salary.max >= filters.salaryMin!
    );
  }

  if (filters.salaryMax) {
    filteredJobs = filteredJobs.filter(job =>
      job.salary?.min && job.salary.min <= filters.salaryMax!
    );
  }

  if (filters.location?.city) {
    filteredJobs = filteredJobs.filter(job =>
      job.location?.city?.toLowerCase().includes(filters.location!.city!.toLowerCase())
    );
  }

  if (filters.location?.country) {
    filteredJobs = filteredJobs.filter(job =>
      job.location?.country?.toLowerCase().includes(filters.location!.country!.toLowerCase())
    );
  }

  if (filters.tags && filters.tags.length > 0) {
    filteredJobs = filteredJobs.filter(job =>
      job.tags?.some(tag => filters.tags!.includes(tag))
    );
  }

  // Date filtering
  if (filters.datePosted && filters.datePosted !== 'any') {
    const now = Date.now();
    let cutoff: number;

    switch (filters.datePosted) {
      case '24h':
        cutoff = now - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        cutoff = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        cutoff = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        cutoff = 0;
    }

    if (cutoff > 0) {
      const cutoffDate = Timestamp.fromMillis(cutoff);
      filteredJobs = filteredJobs.filter(job =>
        job.publishedAt && job.publishedAt.toMillis && job.publishedAt.toMillis() >= cutoff
      );
    }
  }

  const lastDocument = snapshot.docs[snapshot.docs.length - 1];
  const hasMore = snapshot.docs.length === pageSize;

  return {
    jobs: filteredJobs,
    lastDocument,
    hasMore,
  };
}

// Get jobs by employer ID
export async function getJobsByEmployer(employerId: string): Promise<JobData[]> {
  if (!db) throw new Error('Firestore not initialized');

  const q = query(
    collection(db, 'jobs'),
    where('employerId', '==', employerId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    jobId: doc.id,
    ...doc.data(),
  })) as JobData[];
}

// Get jobs by company ID
export async function getJobsByCompany(companyId: string): Promise<JobData[]> {
  if (!db) throw new Error('Firestore not initialized');

  const q = query(
    collection(db, 'jobs'),
    where('companyId', '==', companyId),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    jobId: doc.id,
    ...doc.data(),
  })) as JobData[];
}

// Increment a job metric
export async function incrementJobMetric(jobId: string, metric: keyof JobMetrics): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const jobRef = doc(db, 'jobs', jobId);
  await updateDoc(jobRef, {
    [`metrics.${metric}`]: increment(1),
  });
}

// Publish a job (change status from draft to active)
export async function publishJob(jobId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const jobRef = doc(db, 'jobs', jobId);
  await updateDoc(jobRef, {
    status: 'active',
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Pause/Resume a job
export async function toggleJobStatus(jobId: string, pause: boolean): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const jobRef = doc(db, 'jobs', jobId);
  await updateDoc(jobRef, {
    status: pause ? 'paused' : 'active',
    updatedAt: serverTimestamp(),
  });
}

// Get all unique categories
export async function getAllCategories(): Promise<string[]> {
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await getDocs(collection(db, 'jobs'));
  const categories = new Set<string>();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.category) categories.add(data.category);
    if (data.tags) {
      data.tags.forEach((tag: string) => categories.add(tag));
    }
    if (data.skills?.required) {
      data.skills.required.forEach((skill: string) => categories.add(skill));
    }
  });

  return Array.from(categories).sort();
}

// Get all unique locations
export async function getAllLocations(): Promise<{ city: string; country: string }[]> {
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await getDocs(collection(db, 'jobs'));
  const locations = new Set<string>();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.location?.city && data.location?.country) {
      locations.add(`${data.location.city}, ${data.location.country}`);
    }
  });

  return Array.from(locations).map(loc => {
    const [city, country] = loc.split(', ');
    return { city, country };
  });
}
