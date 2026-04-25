'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { JobFilters, SortOption, JobData } from '@/lib/jobs';
import { fetchCareerjetJobs } from '@/lib/careerjet';
import NavHeader from '@/components/NavHeader';
import JobCard from '@/components/JobCard';
import JobFiltersComponent from '@/components/JobFilters';
import { Briefcase, Loader2, AlertCircle } from 'lucide-react';

function JobsContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobFilters>({});
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<{ city: string; country: string }[]>([]);

  useEffect(() => {
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');
    const remote = searchParams.get('remote');

    const newFilters: JobFilters = {};

    if (search) newFilters.search = search;
    if (tag) newFilters.tags = [tag];
    if (remote) newFilters.remotePolicy = [remote];

    if (Object.keys(newFilters).length > 0) {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, authLoading, router]);

  const loadJobs = useCallback(async (nextPage = 1, append = false) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchCareerjetJobs(filters, sortBy, nextPage, 20);
      setJobs((prev) => (append ? [...prev, ...result.jobs] : result.jobs));
      setHasMore(result.hasMore);
      setPage(nextPage);

      const nextCategories = Array.from(new Set(result.jobs.map((job) => job.category).filter(Boolean) as string[]));
      const nextLocations = Array.from(
        new Map(
          result.jobs
            .filter((job) => job.location?.city || job.location?.country)
            .map((job) => {
              const city = job.location?.city || '';
              const country = job.location?.country || '';
              return [`${city}|${country}`, { city, country }];
            }),
        ).values(),
      );

      setCategories(nextCategories);
      setLocations(nextLocations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs. Please try again.');
      console.error('Error loading jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortBy, user]);

  useEffect(() => {
    if (user) {
      loadJobs(1, false);
    }
  }, [user, loadJobs]);

  useEffect(() => {
    if (user) {
      loadJobs(1, false);
    }
  }, [filters, sortBy, user, loadJobs]);

  const handleFiltersChange = (newFilters: JobFilters) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <NavHeader />

      <div className="bg-slate-800/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-slate-900" />
            </div>
            <h1 className="text-2xl font-bold text-white">Job Listings</h1>
          </div>
          <p className="text-slate-400">
            Live Careerjet listings only — legacy Firestore listings are no longer shown.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400 mb-6">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-8">
          <aside className="w-72 flex-shrink-0">
            <JobFiltersComponent
              filters={filters}
              onFiltersChange={handleFiltersChange}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              categories={categories}
              locations={locations}
            />
          </aside>

          <div className="flex-1">
            {isLoading && jobs.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-20">
                <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">No jobs found</h3>
                <p className="text-slate-400">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <JobCard key={job.jobId} job={job} />
                ))}
              </div>
            )}

            {hasMore && !isLoading && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => loadJobs(page + 1, true)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                >
                  Load more jobs
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      }
    >
      <JobsContent />
    </Suspense>
  );
}
