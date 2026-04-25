'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, User, Building2, Briefcase, Loader2, Filter } from 'lucide-react';
import { SearchResult, SearchResultType } from '@/lib/search';
import { Input } from './ui/Input';

export default function SiteSearch() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<SearchResultType>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Close search when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${filterType}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filterType]);

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const getIconForType = (type: SearchResultType) => {
    switch (type) {
      case 'user': return <User size={16} className="text-blue-400" />;
      case 'agency': return <Building2 size={16} className="text-violet-400" />;
      case 'business': return <Building2 size={16} className="text-amber-400" />;
      case 'job': return <Briefcase size={16} className="text-emerald-400" />;
      default: return <Search size={16} className="text-slate-400" />;
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Collapsed Search Icon */}
      {!isExpanded && (
        <button
          onClick={handleExpand}
          className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
          title="Search site"
        >
          <Search size={20} />
        </button>
      )}

      {/* Expanded Search Bar */}
      <div
        className={`transition-all duration-300 ease-in-out flex items-center overflow-hidden ${
          isExpanded ? 'w-[280px] sm:w-[350px] opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <div className="flex w-full bg-slate-900 border border-white/10 rounded-xl">
          <div className="relative flex items-center pl-3">
             <Search size={18} className="text-slate-500" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim().length > 0) {
                setIsExpanded(false);
                router.push(`/search?q=${encodeURIComponent(query.trim())}&type=${filterType}`);
              }
            }}
            placeholder="Search..."
            className="w-full bg-transparent border-none px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-0"
          />
          {/* Deeply filterable dropdown */}
          <div className="relative flex items-center pr-1 border-l border-white/10">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as SearchResultType)}
              className="bg-transparent text-xs text-slate-400 py-2 pl-2 pr-6 appearance-none focus:outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="user">Users</option>
              <option value="agency">Agencies</option>
              <option value="business">Businesses</option>
              <option value="job">Jobs</option>
            </select>
          </div>
          <button
            onClick={() => {
              setIsExpanded(false);
              setQuery('');
            }}
            className="p-2 text-slate-500 hover:text-slate-300"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isExpanded && query.length >= 2 && (
        <div className="absolute top-full right-0 mt-2 w-[300px] sm:w-[400px] max-h-[400px] overflow-y-auto bg-slate-800 border border-white/10 rounded-xl shadow-xl z-50">
          {isLoading ? (
            <div className="p-4 flex items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mr-2" size={18} />
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2 flex flex-col">
              {results.map((res) => (
                <Link
                  key={`${res.type}-${res.id}`}
                  href={res.url}
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center px-4 py-3 hover:bg-white/5 transition-colors gap-3 group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center">
                    {res.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={res.image} alt={res.title} className="w-full h-full object-cover" />
                    ) : (
                      getIconForType(res.type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-white truncate">
                      {res.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {res.subtitle}
                    </p>
                  </div>
                  <div className="text-xs font-medium px-2 py-1 rounded bg-slate-700/50 text-slate-400 capitalize">
                    {res.type}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-sm">
              No results found for &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
