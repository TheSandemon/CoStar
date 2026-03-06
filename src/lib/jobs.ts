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

  // Source tracking
  source?: string;
  url?: string;
}

// Scraped Jobs Collection Interface
// Fields from the /scrapedJobs Firestore collection
export interface ScrapedJobData {
  id?: string;
  jobId?: string;
  title?: string;
  company?: string;
  companyName?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  description?: string;
  shortDescription?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: string;
  job_type?: string;
  employmentType?: string;
  remote?: string;
  remote_policy?: string;
  experience_level?: string;
  skills?: string[];
  tags?: string[];
  category?: string;
  posted_date?: any;
  createdAt?: any;
  apply_url?: string;
  application_url?: string;
  source?: string;
  url?: string;
  date_scraped?: any;
  // Additional URL field variations
  link?: string;
  applyLink?: string;
  job_url?: string;
  jobUrl?: string;
  // Email fields
  email?: string;
  apply_email?: string;
  contact_email?: string;
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

// Convert scraped job to JobData for display
export function convertScrapedJobToJobData(scraped: ScrapedJobData): JobData {
  // Determine remote policy from various field formats
  let remotePolicy: 'remote' | 'hybrid' | 'onsite' | 'flexible' | undefined;
  if (scraped.remote === 'remote' || scraped.remote_policy === 'remote') {
    remotePolicy = 'remote';
  } else if (scraped.remote === 'hybrid' || scraped.remote_policy === 'hybrid') {
    remotePolicy = 'hybrid';
  } else if (scraped.remote === 'onsite' || scraped.remote_policy === 'onsite') {
    remotePolicy = 'onsite';
  } else if (scraped.remote === 'flexible' || scraped.remote_policy === 'flexible') {
    remotePolicy = 'flexible';
  }

  // Map job type
  const employmentType = mapJobType(scraped.job_type || scraped.employmentType);

  // Map experience level
  const experienceLevel = mapExperienceLevel(scraped.experience_level);

  return {
    jobId: scraped.id || scraped.jobId,
    title: scraped.title,
    companyName: scraped.company || scraped.companyName,
    slug: scraped.id ? generateSlug(scraped.title || '') : undefined,
    description: scraped.description,
    shortDescription: scraped.shortDescription,
    location: {
      city: scraped.city || extractCity(scraped.location),
      state: scraped.state,
      country: scraped.country || extractCountry(scraped.location),
      remotePolicy,
      remoteNotes: scraped.remote,
    },
    salary: {
      min: scraped.salary_min,
      max: scraped.salary_max,
      currency: scraped.salary_currency,
      period: mapSalaryPeriod(scraped.salary_period),
      visible: !!(scraped.salary_min || scraped.salary_max),
    },
    employment: {
      type: employmentType,
      experienceLevel,
    },
    tags: scraped.tags || scraped.skills,
    category: scraped.category,
    application: {
      url: scraped.apply_url || scraped.application_url || scraped.url || scraped.link || scraped.applyLink || scraped.job_url || scraped.jobUrl || '',
      method: (scraped.apply_url || scraped.application_url || scraped.url || scraped.link) ? 'external' : undefined,
      email: scraped.email || scraped.apply_email || scraped.contact_email,
    },
    createdAt: scraped.posted_date || scraped.createdAt || scraped.date_scraped,
    source: scraped.source,
    // Store original URL for reference
    url: scraped.url,
  };
}

// Helper to map job type to standard format
function mapJobType(type?: string): 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary' | 'freelance' | undefined {
  if (!type) return undefined;
  const lower = type.toLowerCase();
  if (lower.includes('full') || lower === 'ft') return 'full-time';
  if (lower.includes('part') || lower === 'pt') return 'part-time';
  if (lower.includes('contract') || lower === 'ctc') return 'contract';
  if (lower.includes('intern')) return 'internship';
  if (lower.includes('temp') || lower.includes('temporary')) return 'temporary';
  if (lower.includes('freelance') || lower.includes('freelance')) return 'freelance';
  return undefined;
}

// Helper to map experience level to standard format
function mapExperienceLevel(level?: string): 'entry' | 'mid' | 'senior' | 'lead' | 'director' | 'executive' | undefined {
  if (!level) return undefined;
  const lower = level.toLowerCase();
  if (lower.includes('entry') || lower.includes('junior') || lower.includes('jr')) return 'entry';
  if (lower.includes('mid') || lower.includes('intermediate')) return 'mid';
  if (lower.includes('senior') || lower.includes('sr')) return 'senior';
  if (lower.includes('lead')) return 'lead';
  if (lower.includes('director')) return 'director';
  if (lower.includes('executive')) return 'executive';
  return undefined;
}

// Helper to map salary period
function mapSalaryPeriod(period?: string): 'hourly' | 'monthly' | 'yearly' | undefined {
  if (!period) return undefined;
  const lower = period.toLowerCase();
  if (lower.includes('hour')) return 'hourly';
  if (lower.includes('month')) return 'monthly';
  if (lower.includes('year') || lower.includes('annum')) return 'yearly';
  return undefined;
}

// Helper to extract city from location string
function extractCity(location?: string): string | undefined {
  if (!location) return undefined;
  const parts = location.split(',');
  return parts[0]?.trim();
}

// Helper to extract country from location string
function extractCountry(location?: string): string | undefined {
  if (!location) return undefined;
  const parts = location.split(',');
  return parts[parts.length - 1]?.trim();
}

// Get jobs from scrapedJobs collection
export async function getScrapedJobs(
  filters: JobFilters = {},
  sortBy: SortOption = 'recent',
  pageSize: number = 20,
  lastDoc?: any
): Promise<{ jobs: JobData[]; lastDocument: any; hasMore: boolean }> {
  if (!db) throw new Error('Firestore not initialized');

  // Query scrapedJobs collection - get all documents
  // Use a larger limit to ensure we get all jobs (max 500 for client-side filtering)
  const q = query(
    collection(db, 'scrapedJobs'),
    limit(500)
  );

  let snapshot = await getDocs(q);

  let jobs: JobData[] = snapshot.docs.map(doc => {
    const data = doc.data() as ScrapedJobData;
    return convertScrapedJobToJobData({ ...data, id: doc.id });
  });

  // Client-side filtering for employment type
  const employmentTypes = filters.employmentType || [];
  if (employmentTypes.length > 0) {
    jobs = jobs.filter(job =>
      job.employment?.type && employmentTypes.includes(job.employment.type)
    );
  }

  // Client-side filtering for experience level
  const experienceLevels = filters.experienceLevel || [];
  if (experienceLevels.length > 0) {
    jobs = jobs.filter(job =>
      job.employment?.experienceLevel && experienceLevels.includes(job.employment.experienceLevel)
    );
  }

  // Client-side filtering for category
  if (filters.category) {
    jobs = jobs.filter(job => job.category === filters.category);
  }

  // Client-side filtering for date posted
  if (filters.datePosted && filters.datePosted !== 'any') {
    const now = new Date();
    let cutoffDate: Date;

    switch (filters.datePosted) {
      case '24h':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0);
    }

    jobs = jobs.filter(job => {
      if (!job.createdAt) return true;
      let jobDate: Date;
      if (job.createdAt.toDate) {
        jobDate = job.createdAt.toDate();
      } else {
        jobDate = new Date(job.createdAt);
      }
      return jobDate >= cutoffDate;
    });
  }

  // Client-side filtering for remote policy
  if (filters.remotePolicy && filters.remotePolicy.length > 0) {
    jobs = jobs.filter(job =>
      job.location?.remotePolicy && (filters.remotePolicy ?? []).includes(job.location.remotePolicy)
    );
  }

  // Salary filtering
  if (filters.salaryMin) {
    jobs = jobs.filter(job =>
      job.salary?.max && job.salary.max >= filters.salaryMin!
    );
  }

  if (filters.salaryMax) {
    jobs = jobs.filter(job =>
      job.salary?.min && job.salary.min <= filters.salaryMax!
    );
  }

  // Location filtering
  if (filters.location?.city) {
    jobs = jobs.filter(job =>
      job.location?.city?.toLowerCase().includes(filters.location!.city!.toLowerCase())
    );
  }

  if (filters.location?.country) {
    jobs = jobs.filter(job =>
      job.location?.country?.toLowerCase().includes(filters.location!.country!.toLowerCase())
    );
  }

  // Tags/skills filtering
  if (filters.tags && filters.tags.length > 0) {
    jobs = jobs.filter(job =>
      job.tags?.some(tag => filters.tags!.includes(tag))
    );
  }

  // Text search
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    jobs = jobs.filter(job =>
      job.title?.toLowerCase().includes(searchLower) ||
      job.companyName?.toLowerCase().includes(searchLower) ||
      job.description?.toLowerCase().includes(searchLower) ||
      job.shortDescription?.toLowerCase().includes(searchLower) ||
      job.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
      job.location?.city?.toLowerCase().includes(searchLower) ||
      job.location?.country?.toLowerCase().includes(searchLower)
    );
  }

  // Sort
  switch (sortBy) {
    case 'recent':
      jobs.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
        return dateB.getTime() - dateA.getTime();
      });
      break;
    case 'salary_high':
      jobs.sort((a, b) => (b.salary?.max || 0) - (a.salary?.max || 0));
      break;
    case 'salary_low':
      jobs.sort((a, b) => (a.salary?.min || 0) - (b.salary?.min || 0));
      break;
    case 'company_az':
      jobs.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
      break;
  }

  // Limit results
  const totalJobsCount = jobs.length;
  jobs = jobs.slice(0, pageSize);

  return {
    jobs,
    lastDocument: null,
    hasMore: totalJobsCount > pageSize,
  };
}

// Get categories from scrapedJobs
export async function getScrapedCategories(): Promise<string[]> {
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await getDocs(collection(db, 'scrapedJobs'));
  const categories = new Set<string>();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.category) categories.add(data.category);
    if (data.job_type) categories.add(data.job_type);
    if (Array.isArray(data.tags)) {
      data.tags.forEach((tag: string) => categories.add(tag));
    }
    if (Array.isArray(data.skills)) {
      data.skills.forEach((skill: string) => categories.add(skill));
    }
  });

  return Array.from(categories).sort();
}

// Get locations from scrapedJobs
export async function getScrapedLocations(): Promise<{ city: string; country: string }[]> {
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await getDocs(collection(db, 'scrapedJobs'));
  const locations = new Set<string>();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    // Use city/country fields if available
    if (data.city && data.country) {
      locations.add(`${data.city}, ${data.country}`);
    } else if (data.location) {
      // Fall back to location string
      locations.add(data.location);
    }
  });

  return Array.from(locations).map(loc => {
    const [city, ...countryParts] = loc.split(', ');
    return { city: city.trim(), country: countryParts.join(', ').trim() };
  });
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

// Get a single scraped job by ID
export async function getScrapedJobById(jobId: string): Promise<JobData | null> {
  if (!db) throw new Error('Firestore not initialized');

  const jobRef = doc(db, 'scrapedJobs', jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) return null;

  const data = jobSnap.data() as ScrapedJobData;
  return convertScrapedJobToJobData({ ...data, id: jobSnap.id });
}

// Get jobs with filters and sorting
export async function getJobs(
  filters: JobFilters = {},
  sortBy: SortOption = 'recent',
  pageSize: number = 20,
  lastDoc?: any
): Promise<{ jobs: JobData[]; lastDocument: any; hasMore: boolean }> {
  if (!db) throw new Error('Firestore not initialized');

  // Simple query - get all active jobs first, then filter client-side
  // This avoids needing composite indexes in Firestore
  const q = query(
    collection(db, 'jobs'),
    where('status', '==', 'active'),
    limit(pageSize * 3) // Get more to filter
  );

  let snapshot = await getDocs(q);

  let jobs: JobData[] = snapshot.docs.map(doc => ({
    jobId: doc.id,
    ...doc.data(),
  })) as JobData[];

  // Client-side filtering for visibility
  jobs = jobs.filter(job =>
    job.visibility === 'public' || job.visibility === 'unlisted'
  );

  // Client-side filtering for employment type
  const employmentTypes = filters.employmentType || [];
  if (employmentTypes.length > 0) {
    jobs = jobs.filter(job =>
      job.employment?.type && employmentTypes.includes(job.employment.type)
    );
  }

  // Client-side filtering for experience level
  const experienceLevels = filters.experienceLevel || [];
  if (experienceLevels.length > 0) {
    jobs = jobs.filter(job =>
      job.employment?.experienceLevel && experienceLevels.includes(job.employment.experienceLevel)
    );
  }

  // Client-side filtering for category
  if (filters.category) {
    jobs = jobs.filter(job => job.category === filters.category);
  }

  // Client-side filtering for remote policy
  if (filters.remotePolicy && filters.remotePolicy.length > 0) {
    jobs = jobs.filter(job =>
      job.location?.remotePolicy && (filters.remotePolicy ?? []).includes(job.location.remotePolicy)
    );
  }

  // Salary filtering
  if (filters.salaryMin) {
    jobs = jobs.filter(job =>
      job.salary?.max && job.salary.max >= filters.salaryMin!
    );
  }

  if (filters.salaryMax) {
    jobs = jobs.filter(job =>
      job.salary?.min && job.salary.min <= filters.salaryMax!
    );
  }

  // Location filtering
  if (filters.location?.city) {
    jobs = jobs.filter(job =>
      job.location?.city?.toLowerCase().includes(filters.location!.city!.toLowerCase())
    );
  }

  if (filters.location?.country) {
    jobs = jobs.filter(job =>
      job.location?.country?.toLowerCase().includes(filters.location!.country!.toLowerCase())
    );
  }

  // Tags filtering
  if (filters.tags && filters.tags.length > 0) {
    jobs = jobs.filter(job =>
      job.tags?.some(tag => filters.tags!.includes(tag))
    );
  }

  // Text search
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    jobs = jobs.filter(job =>
      job.title?.toLowerCase().includes(searchLower) ||
      job.companyName?.toLowerCase().includes(searchLower) ||
      job.description?.toLowerCase().includes(searchLower) ||
      job.shortDescription?.toLowerCase().includes(searchLower) ||
      job.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
      job.skills?.required?.some(skill => skill.toLowerCase().includes(searchLower)) ||
      job.skills?.preferred?.some(skill => skill.toLowerCase().includes(searchLower))
    );
  }

  // Sort
  switch (sortBy) {
    case 'recent':
      jobs.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      break;
    case 'salary_high':
      jobs.sort((a, b) => (b.salary?.max || 0) - (a.salary?.max || 0));
      break;
    case 'salary_low':
      jobs.sort((a, b) => (a.salary?.min || 0) - (b.salary?.min || 0));
      break;
    case 'company_az':
      jobs.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
      break;
    case 'most_viewed':
      jobs.sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0));
      break;
  }

  // Limit results
  const totalJobsCount = jobs.length;
  jobs = jobs.slice(0, pageSize);

  return {
    jobs,
    lastDocument: null,
    hasMore: totalJobsCount > pageSize,
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
