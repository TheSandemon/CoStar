'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getScrapedJobs, getScrapedCategories, getScrapedLocations, JobFilters, SortOption, JobData } from '@/lib/jobs';
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
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<{ city: string; country: string }[]>([]);

  // Initialize filters from URL params
  useEffect(() => {
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');
    const remote = searchParams.get('remote');

    const newFilters: JobFilters = {};

    if (search) {
      newFilters.search = search;
    }

    if (tag) {
      newFilters.tags = [tag];
    }

    if (remote) {
      newFilters.remotePolicy = [remote];
    }

    // Only update if we have URL params
    if (Object.keys(newFilters).length > 0) {
      setFilters(prev => ({ ...prev, ...newFilters }));
    }
  }, [searchParams]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, authLoading, router]);

  // Load jobs from Firestore (scrapedJobs collection)
  const loadJobs = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getScrapedJobs(
        filters,
        sortBy,
        20,
        lastDoc
      );

      setJobs(result.jobs);
      setHasMore(result.hasMore);
      setLastDoc(result.lastDocument);
    } catch (err) {
      setError('Failed to load jobs. Please try again.');
      console.error('Error loading jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortBy, lastDoc, user]);

  // Initial load on mount
  useEffect(() => {
    if (user) {
      loadJobs();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load categories and locations from scrapedJobs
  useEffect(() => {
    if (!user) return;

    const loadMeta = async () => {
      try {
        const cats = await getScrapedCategories();
        const locs = await getScrapedLocations();
        setCategories(cats);
        setLocations(locs);
      } catch (err) {
        console.error('Error loading filters meta:', err);
      }
    };
    loadMeta();
  }, [user]);

  // Reload when filters or sort changes
  useEffect(() => {
    if (user) {
      setLastDoc(null);
      loadJobs();
    }
  }, [filters, sortBy, user]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Header */}
      <div className="bg-slate-800/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-slate-900" />
            </div>
            <h1 className="text-2xl font-bold text-white">Job Listings</h1>
          </div>
          <p className="text-slate-400">
            Find your next opportunity from {jobs.length > 0 ? `${jobs.length}+` : 'hundreds of'} open positions
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400 mb-6">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-8">
          {/* Filters Sidebar */}
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

          {/* Job Listings */}
          <div className="flex-1">
            {isLoading ? (
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
                {jobs.map(job => (
                  <JobCard key={job.jobId} job={job} />
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && !isLoading && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadJobs}
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
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    }>
      <JobsContent />
    </Suspense>
  );
}
