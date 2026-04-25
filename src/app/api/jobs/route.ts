import { NextRequest, NextResponse } from 'next/server';
import { JobData, JobFilters, SortOption } from '@/lib/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_SECONDS = 60 * 15;

type RemotePolicy = 'remote' | 'hybrid' | 'onsite' | 'flexible' | undefined;
type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary' | 'freelance' | undefined;
type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'director' | 'executive' | undefined;
type SalaryPeriod = 'hourly' | 'monthly' | 'yearly' | undefined;
type ProviderName = 'careerjet' | 'jooble';

type CareerjetApiJob = {
  title?: string;
  company?: string;
  date?: string;
  description?: string;
  locations?: string;
  salary?: string;
  salary_currency_code?: string;
  salary_max?: number;
  salary_min?: number;
  salary_type?: 'Y' | 'M' | 'W' | 'D' | 'H';
  site?: string;
  url?: string;
};

type CareerjetApiResponse = {
  type?: string;
  hits?: number;
  message?: string;
  pages?: number;
  jobs?: CareerjetApiJob[];
  locations?: string[];
};

type JoobleApiJob = {
  title?: string;
  company?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  type?: string;
  link?: string;
  source?: string;
  updated?: string;
};

type JoobleApiResponse = {
  totalCount?: number;
  jobs?: JoobleApiJob[];
};

type ProviderResult = {
  provider: ProviderName;
  jobs: JobData[];
  total: number;
  pages: number;
  message?: string | null;
  locationChoices?: string[];
};

function jsonResponse(body: Record<string, unknown>, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 4}`);
  return response;
}

function getAuthHeader(apiKey: string) {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function inferRemotePolicyFromText(text: string): RemotePolicy {
  const haystack = text.toLowerCase();
  if (haystack.includes('hybrid')) return 'hybrid';
  if (haystack.includes('remote')) return 'remote';
  if (haystack.includes('on-site') || haystack.includes('onsite')) return 'onsite';
  return undefined;
}

function inferEmploymentTypeFromText(text: string): EmploymentType {
  const haystack = text.toLowerCase();
  if (haystack.includes('intern')) return 'internship';
  if (haystack.includes('contract')) return 'contract';
  if (haystack.includes('temporary') || haystack.includes('temp ')) return 'temporary';
  if (haystack.includes('part-time') || haystack.includes('part time')) return 'part-time';
  if (haystack.includes('freelance')) return 'freelance';
  return 'full-time';
}

function inferExperienceLevelFromText(text: string): ExperienceLevel {
  const haystack = text.toLowerCase();
  if (haystack.includes('director')) return 'director';
  if (haystack.includes('executive') || haystack.includes('chief ')) return 'executive';
  if (haystack.includes('lead') || haystack.includes('principal')) return 'lead';
  if (haystack.includes('senior') || haystack.includes('sr.')) return 'senior';
  if (haystack.includes('junior') || haystack.includes('entry')) return 'entry';
  return 'mid';
}

function salaryPeriodFromCode(code?: CareerjetApiJob['salary_type']): SalaryPeriod {
  switch (code) {
    case 'M':
      return 'monthly';
    case 'H':
      return 'hourly';
    default:
      return 'yearly';
  }
}

function truncateDescription(text?: string, maxLength = 180) {
  if (!text) return '';
  const normalized = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}…`;
}

function parseLocation(raw?: string) {
  const parts = (raw || '').split(',').map((part) => part.trim()).filter(Boolean);
  return {
    city: parts[0],
    country: parts.length > 1 ? parts[parts.length - 1] : parts[0],
  };
}

function parseSalaryString(text?: string) {
  if (!text) return undefined;
  const matches = text.match(/\d[\d,.]*/g)?.map((value) => Number(value.replace(/,/g, ''))).filter((value) => Number.isFinite(value));
  const currencyMatch = text.match(/USD|EUR|GBP|CAD|AUD|INR|\$|€|£/i)?.[0];
  if (!matches?.length) {
    return {
      currency: currencyMatch,
      visible: true,
    };
  }

  return {
    min: matches[0],
    max: matches[1] || matches[0],
    currency: currencyMatch,
    visible: true,
  };
}

function mapCareerjetJob(job: CareerjetApiJob): JobData {
  const location = parseLocation(job.locations);
  const text = `${job.title || ''} ${job.description || ''} ${job.locations || ''}`;
  const createdAt = job.date ? new Date(job.date).toISOString() : new Date().toISOString();
  const jobId = hashString(`careerjet|${job.url || ''}|${job.title || ''}|${job.company || ''}`);

  return {
    jobId,
    title: job.title,
    companyName: job.company,
    description: truncateDescription(job.description, 4000),
    shortDescription: truncateDescription(job.description, 180),
    location: {
      city: location.city,
      country: location.country,
      remotePolicy: inferRemotePolicyFromText(text),
    },
    salary: job.salary_min || job.salary_max || job.salary
      ? {
          min: job.salary_min,
          max: job.salary_max,
          currency: job.salary_currency_code || undefined,
          period: salaryPeriodFromCode(job.salary_type),
          visible: true,
        }
      : undefined,
    employment: {
      type: inferEmploymentTypeFromText(text),
      experienceLevel: inferExperienceLevelFromText(text),
    },
    application: {
      method: 'external',
      url: job.url,
    },
    source: job.site ? `Careerjet • ${job.site}` : 'Careerjet',
    url: job.url,
    createdAt,
    category: 'Careerjet',
    tags: [inferEmploymentTypeFromText(text), inferExperienceLevelFromText(text), inferRemotePolicyFromText(text)].filter(Boolean) as string[],
  };
}

function mapJoobleJob(job: JoobleApiJob): JobData {
  const text = `${job.title || ''} ${job.snippet || ''} ${job.location || ''} ${job.type || ''}`;
  const location = parseLocation(job.location);
  const salary = parseSalaryString(job.salary);
  const createdAt = job.updated ? new Date(job.updated).toISOString() : new Date().toISOString();
  const jobId = hashString(`jooble|${job.link || ''}|${job.title || ''}|${job.company || ''}`);

  return {
    jobId,
    title: job.title,
    companyName: job.company,
    description: truncateDescription(job.snippet, 4000),
    shortDescription: truncateDescription(job.snippet, 180),
    location: {
      city: location.city,
      country: location.country,
      remotePolicy: inferRemotePolicyFromText(text),
    },
    salary: salary ? { ...salary, period: undefined } : undefined,
    employment: {
      type: inferEmploymentTypeFromText(text),
      experienceLevel: inferExperienceLevelFromText(text),
    },
    application: {
      method: 'external',
      url: job.link,
    },
    source: job.source ? `Jooble • ${job.source}` : 'Jooble',
    url: job.link,
    createdAt,
    category: 'Jooble',
    tags: [inferEmploymentTypeFromText(text), inferExperienceLevelFromText(text), inferRemotePolicyFromText(text)].filter(Boolean) as string[],
  };
}

function applyLocalFilters(jobs: JobData[], filters: JobFilters, sort: SortOption) {
  let filtered = jobs;

  if (filters.remotePolicy?.length) {
    filtered = filtered.filter((job) => job.location?.remotePolicy && filters.remotePolicy?.includes(job.location.remotePolicy));
  }

  if (filters.employmentType?.length) {
    filtered = filtered.filter((job) => job.employment?.type && filters.employmentType?.includes(job.employment.type));
  }

  if (filters.experienceLevel?.length) {
    filtered = filtered.filter((job) => job.employment?.experienceLevel && filters.experienceLevel?.includes(job.employment.experienceLevel));
  }

  if (filters.salaryMin) {
    const salaryMin = filters.salaryMin;
    filtered = filtered.filter((job) => (job.salary?.max || job.salary?.min || 0) >= salaryMin);
  }

  if (filters.salaryMax) {
    const salaryMax = filters.salaryMax;
    filtered = filtered.filter((job) => (job.salary?.min || job.salary?.max || 0) <= salaryMax);
  }

  if (filters.datePosted && filters.datePosted !== 'any') {
    const maxAgeDays = filters.datePosted === '24h' ? 1 : filters.datePosted === 'week' ? 7 : 30;
    filtered = filtered.filter((job) => {
      if (!job.createdAt) return true;
      const createdAt = new Date(job.createdAt as string);
      return Date.now() - createdAt.getTime() <= maxAgeDays * 24 * 60 * 60 * 1000;
    });
  }

  switch (sort) {
    case 'salary_high':
      filtered = [...filtered].sort((a, b) => (b.salary?.max || b.salary?.min || 0) - (a.salary?.max || a.salary?.min || 0));
      break;
    case 'salary_low':
      filtered = [...filtered].sort((a, b) => (a.salary?.min || a.salary?.max || Number.MAX_SAFE_INTEGER) - (b.salary?.min || b.salary?.max || Number.MAX_SAFE_INTEGER));
      break;
    case 'company_az':
      filtered = [...filtered].sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
      break;
    case 'recent':
    default:
      filtered = [...filtered].sort((a, b) => new Date(b.createdAt as string || 0).getTime() - new Date(a.createdAt as string || 0).getTime());
      break;
  }

  return filtered;
}

function dedupeJobs(jobs: JobData[]) {
  const seen = new Set<string>();
  const deduped: JobData[] = [];

  for (const job of jobs) {
    const key = `${(job.title || '').toLowerCase()}|${(job.companyName || '').toLowerCase()}|${(job.url || '').toLowerCase()}|${(job.location?.city || '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(job);
  }

  return deduped;
}

function buildRequestState(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const location = searchParams.get('location') || '';
  const source = (searchParams.get('source') || 'all').toLowerCase();
  const sort = (searchParams.get('sort') as SortOption) || 'recent';
  const page = Math.min(Math.max(Number(searchParams.get('page') || '1'), 1), 10);
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') || '20'), 1), 100);
  const employmentType = searchParams.get('employmentType')?.split(',').filter(Boolean) || [];
  const remotePolicy = searchParams.get('remotePolicy')?.split(',').filter(Boolean) || [];
  const experienceLevel = searchParams.get('experienceLevel')?.split(',').filter(Boolean) || [];
  const salaryMin = Number(searchParams.get('salaryMin') || '') || undefined;
  const salaryMax = Number(searchParams.get('salaryMax') || '') || undefined;
  const datePosted = (searchParams.get('datePosted') as JobFilters['datePosted']) || undefined;

  const filters: JobFilters = {
    search: search || undefined,
    remotePolicy: remotePolicy.length ? remotePolicy : undefined,
    employmentType: employmentType.length ? employmentType : undefined,
    experienceLevel: experienceLevel.length ? experienceLevel : undefined,
    salaryMin,
    salaryMax,
    datePosted,
  };

  const userIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'CoStar/1.0';

  return { search, location, source, sort, page, pageSize, filters, userIp, userAgent };
}

async function fetchCareerjet(state: ReturnType<typeof buildRequestState>, apiKey: string): Promise<ProviderResult> {
  const apiParams = new URLSearchParams({
    locale_code: 'en_US',
    keywords: state.search || 'jobs',
    page: String(state.page),
    page_size: String(state.pageSize),
    sort: state.sort === 'recent' ? 'date' : state.sort === 'salary_high' ? 'salary' : 'relevance',
    user_ip: state.userIp,
    user_agent: state.userAgent,
  });

  if (state.location) apiParams.set('location', state.location);
  if (state.filters.employmentType?.includes('part-time')) apiParams.set('work_hours', 'p');
  else if (state.filters.employmentType?.includes('full-time')) apiParams.set('work_hours', 'f');
  else if (state.filters.employmentType?.includes('contract')) apiParams.set('contract_type', 'c');
  else if (state.filters.employmentType?.includes('temporary')) apiParams.set('contract_type', 't');
  else if (state.filters.employmentType?.includes('internship')) apiParams.set('contract_type', 'i');

  const response = await fetch(`https://search.api.careerjet.net/v4/query?${apiParams.toString()}`, {
    headers: {
      Authorization: getAuthHeader(apiKey),
      Accept: 'application/json',
    },
    next: { revalidate: CACHE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Careerjet request failed (${response.status})`);
  }

  const data = (await response.json()) as CareerjetApiResponse;
  if (data.type === 'LOCATIONS') {
    return {
      provider: 'careerjet',
      jobs: [],
      total: 0,
      pages: 0,
      message: data.message || null,
      locationChoices: data.locations || [],
    };
  }

  return {
    provider: 'careerjet',
    jobs: (data.jobs || []).map(mapCareerjetJob),
    total: data.hits || 0,
    pages: data.pages || 0,
    message: data.message || null,
  };
}

async function fetchJooble(state: ReturnType<typeof buildRequestState>, apiKey: string): Promise<ProviderResult> {
  const response = await fetch(`https://jooble.org/api/${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      keywords: state.search || 'jobs',
      location: state.location || '',
      page: state.page,
    }),
    next: { revalidate: CACHE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Jooble request failed (${response.status})`);
  }

  const data = (await response.json()) as JoobleApiResponse;
  return {
    provider: 'jooble',
    jobs: (data.jobs || []).map(mapJoobleJob),
    total: data.totalCount || 0,
    pages: Math.ceil((data.totalCount || 0) / state.pageSize),
    message: null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const state = buildRequestState(req);
    const careerjetKey = process.env.CAREERJET_API_KEY;
    const joobleKey = process.env.JOOBLE_API_KEY;

    const providers: Promise<ProviderResult>[] = [];

    if ((state.source === 'all' || state.source === 'careerjet') && careerjetKey) {
      providers.push(fetchCareerjet(state, careerjetKey));
    }

    if ((state.source === 'all' || state.source === 'jooble') && joobleKey) {
      providers.push(fetchJooble(state, joobleKey));
    }

    if (providers.length === 0) {
      return jsonResponse({ error: 'No job provider API keys are configured.' }, { status: 500 });
    }

    const settled = await Promise.allSettled(providers);
    const successes = settled.filter((result): result is PromiseFulfilledResult<ProviderResult> => result.status === 'fulfilled').map((result) => result.value);
    const failures = settled.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

    if (successes.length === 0) {
      return jsonResponse({ error: failures.map((failure) => failure.reason?.message || 'Provider failed').join(' | ') }, { status: 502 });
    }

    const locationChoices = successes.flatMap((result) => result.locationChoices || []);
    if (locationChoices.length > 0 && successes.every((result) => result.jobs.length === 0)) {
      return jsonResponse({
        jobs: [],
        total: 0,
        page: state.page,
        pages: 0,
        hasMore: false,
        source: successes.map((result) => result.provider).join('+'),
        locationChoices,
        message: successes.map((result) => result.message).filter(Boolean).join(' | ') || null,
        warnings: failures.map((failure) => failure.reason?.message).filter(Boolean),
      });
    }

    const merged = dedupeJobs(successes.flatMap((result) => result.jobs));
    const filtered = applyLocalFilters(merged, state.filters, state.sort);
    const start = (state.page - 1) * state.pageSize;
    const pagedJobs = filtered.slice(start, start + state.pageSize);
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / state.pageSize));

    return jsonResponse({
      jobs: pagedJobs,
      total,
      page: state.page,
      pages,
      hasMore: state.page < pages,
      source: successes.map((result) => result.provider).join('+'),
      warnings: failures.map((failure) => failure.reason?.message).filter(Boolean),
      message: successes.map((result) => result.message).filter(Boolean).join(' | ') || null,
      cachedForSeconds: CACHE_SECONDS,
    });
  } catch (error) {
    console.error('[api/jobs]', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
