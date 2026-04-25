import { JobData, JobFilters, SortOption } from './jobs';

export interface CareerjetJobsResponse {
  jobs: JobData[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
  source: 'careerjet';
}

function toPortableJob(job: JobData): Partial<JobData> {
  return {
    jobId: job.jobId,
    title: job.title,
    companyName: job.companyName,
    description: job.description,
    shortDescription: job.shortDescription,
    location: job.location,
    salary: job.salary,
    employment: job.employment,
    category: job.category,
    tags: job.tags,
    source: job.source,
    application: job.application,
    url: job.url,
    createdAt: job.createdAt,
  };
}

export function serializeCareerjetJob(job: JobData): string {
  return JSON.stringify(toPortableJob(job));
}

export function deserializeCareerjetJob(payload: string | null): JobData | null {
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload) as JobData;
    return parsed;
  } catch (error) {
    console.error('Failed to parse Careerjet job payload', error);
    return null;
  }
}

export async function fetchCareerjetJobs(
  filters: JobFilters = {},
  sortBy: SortOption = 'recent',
  page = 1,
  pageSize = 20,
): Promise<CareerjetJobsResponse> {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.location?.city || filters.location?.country) {
    params.set('location', [filters.location.city, filters.location.country].filter(Boolean).join(', '));
  }
  if (filters.remotePolicy?.length) params.set('remotePolicy', filters.remotePolicy.join(','));
  if (filters.employmentType?.length) params.set('employmentType', filters.employmentType.join(','));
  if (filters.experienceLevel?.length) params.set('experienceLevel', filters.experienceLevel.join(','));
  if (filters.salaryMin) params.set('salaryMin', String(filters.salaryMin));
  if (filters.salaryMax) params.set('salaryMax', String(filters.salaryMax));
  if (filters.datePosted) params.set('datePosted', filters.datePosted);
  if (filters.category) params.set('category', filters.category);
  if (filters.tags?.length) params.set('tags', filters.tags.join(','));
  params.set('sort', sortBy);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  const response = await fetch(`/api/jobs?${params.toString()}`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Failed to fetch Careerjet jobs');
  }

  return response.json();
}
