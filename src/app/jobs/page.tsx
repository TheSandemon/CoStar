'use client';

import { useState, useEffect, useCallback } from 'react';
import { getJobs, JobFilters, SortOption, JobData } from '@/lib/jobs';
import { getAllCategories, getAllLocations } from '@/lib/jobs';
import JobCard from '@/components/JobCard';
import JobFiltersComponent from '@/components/JobFilters';
import { Briefcase, Loader2, AlertCircle, Grid, List } from 'lucide-react';

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobFilters>({});
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<{ city: string; country: string }[]>([]);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Load categories and locations
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const cats = await getAllCategories();
        const locs = await getAllLocations();
        setCategories(cats);
        setLocations(locs);
      } catch (err) {
        console.error('Error loading filters meta:', err);
      }
    };
    loadMeta();
  }, []);

  // Load jobs
  const loadJobs = useCallback(async (reset = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getJobs(
        filters,
        sortBy,
        20,
        reset ? undefined : lastDoc
      );

      if (reset) {
        setJobs(result.jobs);
      } else {
        setJobs(prev => [...prev, ...result.jobs]);
      }

      setHasMore(result.hasMore);
      setLastDoc(result.lastDocument);
    } catch (err) {
      setError('Failed to load jobs. Please try again.');
      console.error('Error loading jobs:', err);
    } finally {
      setIsLoading(false);
      setInitialLoadDone(true);
    }
  }, [filters, sortBy, lastDoc]);

  // Initial load
  useEffect(() => {
    if (initialLoadDone) {
      loadJobs(true);
    }
  }, [filters, sortBy]);

  // Reset and reload when filters change
  useEffect(() => {
    if (initialLoadDone) {
      setLastDoc(null);
      loadJobs(true);
    }
  }, [filters, sortBy]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadJobs(false);
    }
  };

  const handleFiltersChange = (newFilters: JobFilters) => {
    setFilters(newFilters);
    setLastDoc(null);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setLastDoc(null);
  };

  return (
    <div className="min-h-screen bg-slate-900">
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
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="sticky top-4">
              <JobFiltersComponent
                filters={filters}
                onFiltersChange={handleFiltersChange}
                sortBy={sortBy}
                onSortChange={handleSortChange}
                categories={categories}
                locations={locations}
              />
            </div>
          </div>

          {/* Jobs List */}
          <div className="flex-1">
            {/* View Toggle */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-400 text-sm">
                {isLoading ? 'Loading...' : `${jobs.length} jobs found`}
              </p>
              <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-amber-500 text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-amber-500 text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400 mb-6">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Jobs Grid/List */}
            {jobs.length === 0 && !isLoading ? (
              <div className="bg-slate-800/30 border border-white/10 rounded-xl p-12 text-center">
                <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">No jobs found</h3>
                <p className="text-slate-400">
                  Try adjusting your filters or search criteria
                </p>
              </div>
            ) : (
              <>
                <div className={`space-y-4 ${viewMode === 'grid' ? 'grid md:grid-cols-2 gap-4' : ''}`}>
                  {jobs.map(job => (
                    <JobCard key={job.jobId} job={job} />
                  ))}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoading}
                      className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        'Load More Jobs'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Initial Loading */}
            {isLoading && jobs.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
