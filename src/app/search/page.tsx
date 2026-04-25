'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, User, Building2, Briefcase, Loader2 } from 'lucide-react';
import { SearchResult, SearchResultType } from '@/lib/search';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as SearchResultType) || 'all';

  const [query, setQuery] = useState(q);
  const [filterType, setFilterType] = useState<SearchResultType>(initialType);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (q) {
      setQuery(q);
      setFilterType(initialType);
      performSearch(q, initialType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, initialType]);

  const performSearch = async (searchQuery: string, type: SearchResultType) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setHasSearched(true);
      return;
    }
    
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=${type}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, filterType);
    
    // Update URL without full reload
    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    url.searchParams.set('type', filterType);
    window.history.pushState({}, '', url.toString());
  };

  const handleFilterChange = (type: SearchResultType) => {
    setFilterType(type);
    performSearch(query, type);
    
    const url = new URL(window.location.href);
    url.searchParams.set('type', type);
    window.history.pushState({}, '', url.toString());
  };

  const getIconForType = (type: SearchResultType) => {
    switch (type) {
      case 'user': return <User size={20} className="text-blue-400" />;
      case 'agency': return <Building2 size={20} className="text-violet-400" />;
      case 'business': return <Building2 size={20} className="text-amber-400" />;
      case 'job': return <Briefcase size={20} className="text-emerald-400" />;
      default: return <Search size={20} className="text-slate-400" />;
    }
  };

  const tabs: { id: SearchResultType; label: string }[] = [
    { id: 'all', label: 'All Results' },
    { id: 'user', label: 'Talent' },
    { id: 'agency', label: 'Agencies' },
    { id: 'business', label: 'Companies' },
    { id: 'job', label: 'Jobs' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-6">Search</h1>
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search talent, agencies, jobs, and companies..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || query.length < 2}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 rounded-xl font-medium transition-colors whitespace-nowrap flex items-center justify-center min-w-[120px]"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>

      {hasSearched && (
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === tab.id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Searching...</p>
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-white/5 rounded-2xl">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              We couldn&apos;t find anything matching &quot;{query}&quot;. Try adjusting your search term or selecting a different category.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {results.map((res) => (
              <Link
                key={`${res.type}-${res.id}`}
                href={res.url}
                className="flex items-center gap-4 p-4 bg-slate-900 border border-white/5 hover:border-white/10 hover:bg-slate-800 transition-all rounded-xl group"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center border border-white/5">
                  {res.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={res.image} alt={res.title} className="w-full h-full object-cover" />
                  ) : (
                    getIconForType(res.type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-medium text-slate-200 group-hover:text-white truncate">
                      {res.title}
                    </h3>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-wider">
                      {res.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 truncate">
                    {res.subtitle}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-6 py-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
