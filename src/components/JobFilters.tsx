'use client';

import { JobFilters, SortOption } from '@/lib/jobs';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface JobFiltersProps {
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  categories?: string[];
  locations?: { city: string; country: string }[];
}

const employmentTypes = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'freelance', label: 'Freelance' },
];

const experienceLevels = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior Level' },
  { value: 'lead', label: 'Lead' },
  { value: 'director', label: 'Director' },
  { value: 'executive', label: 'Executive' },
];

const remoteOptions = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

const datePostedOptions = [
  { value: '24h', label: 'Last 24 hours' },
  { value: 'week', label: 'Last week' },
  { value: 'month', label: 'Last month' },
  { value: 'any', label: 'Any time' },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'salary_high', label: 'Salary: High to Low' },
  { value: 'salary_low', label: 'Salary: Low to High' },
  { value: 'company_az', label: 'Company: A-Z' },
  { value: 'most_viewed', label: 'Most Viewed' },
];

export default function JobFiltersComponent({
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  categories = [],
  locations = [],
}: JobFiltersProps) {
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    workType: true,
    location: true,
    salary: true,
    experience: true,
    datePosted: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, search: searchQuery });
  };

  const updateFilter = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = <K extends keyof JobFilters>(
    key: K,
    value: string
  ) => {
    const current = (filters[key] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFilter(key, updated as JobFilters[K]);
  };

  const clearFilters = () => {
    setSearchQuery('');
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(
    key => key !== 'search' && filters[key as keyof JobFilters]
  );

  const FilterSection = ({
    title,
    sectionKey,
    children,
  }: {
    title: string;
    sectionKey: string;
    children: React.ReactNode;
  }) => (
    <div className="border-b border-white/10 pb-4">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="flex items-center justify-between w-full text-white font-medium mb-3"
      >
        <span>{title}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            expandedSections[sectionKey] ? 'rotate-180' : ''
          }`}
        />
      </button>
      {expandedSections[sectionKey] && <div>{children}</div>}
    </div>
  );

  const Checkbox = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: () => void;
    label: string;
  }) => (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          checked
            ? 'bg-amber-500 border-amber-500'
            : 'border-slate-600 group-hover:border-amber-500'
        }`}
        onClick={onChange}
      >
        {checked && (
          <svg className="w-3 h-3 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-slate-300 text-sm">{label}</span>
    </label>
  );

  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search jobs, skills, companies..."
          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
        />
      </form>

      {/* Mobile Filter Toggle */}
      <button
        onClick={() => setShowMobileFilters(!showMobileFilters)}
        className="lg:hidden flex items-center justify-center gap-2 w-full py-2 mb-4 bg-slate-700/50 text-white rounded-lg"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters
        {hasActiveFilters && (
          <span className="px-2 py-0.5 bg-amber-500 text-slate-900 text-xs rounded-full">
            Active
          </span>
        )}
      </button>

      {/* Sort */}
      <div className="mb-4">
        <label className="text-slate-400 text-sm mb-2 block">Sort by</label>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filters Container */}
      <div className={`lg:block ${showMobileFilters ? 'block' : 'hidden'}`}>
        {/* Work Type */}
        <FilterSection title="Work Type" sectionKey="workType">
          <div className="space-y-2">
            {remoteOptions.map(option => (
              <Checkbox
                key={option.value}
                checked={(filters.remotePolicy || []).includes(option.value)}
                onChange={() => toggleArrayFilter('remotePolicy', option.value)}
                label={option.label}
              />
            ))}
          </div>
        </FilterSection>

        {/* Employment Type */}
        <FilterSection title="Employment Type" sectionKey="employmentType">
          <div className="space-y-2">
            {employmentTypes.map(option => (
              <Checkbox
                key={option.value}
                checked={(filters.employmentType || []).includes(option.value)}
                onChange={() => toggleArrayFilter('employmentType', option.value)}
                label={option.label}
              />
            ))}
          </div>
        </FilterSection>

        {/* Experience Level */}
        <FilterSection title="Experience Level" sectionKey="experience">
          <div className="space-y-2">
            {experienceLevels.map(option => (
              <Checkbox
                key={option.value}
                checked={(filters.experienceLevel || []).includes(option.value)}
                onChange={() => toggleArrayFilter('experienceLevel', option.value)}
                label={option.label}
              />
            ))}
          </div>
        </FilterSection>

        {/* Salary Range */}
        <FilterSection title="Salary Range" sectionKey="salary">
          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Minimum</label>
              <select
                value={filters.salaryMin || ''}
                onChange={(e) => updateFilter('salaryMin', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="">Any</option>
                <option value="30000">$30k+</option>
                <option value="50000">$50k+</option>
                <option value="75000">$75k+</option>
                <option value="100000">$100k+</option>
                <option value="150000">$150k+</option>
                <option value="200000">$200k+</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Maximum</label>
              <select
                value={filters.salaryMax || ''}
                onChange={(e) => updateFilter('salaryMax', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="">Any</option>
                <option value="50000">$50k</option>
                <option value="75000">$75k</option>
                <option value="100000">$100k</option>
                <option value="150000">$150k</option>
                <option value="200000">$200k+</option>
              </select>
            </div>
          </div>
        </FilterSection>

        {/* Date Posted */}
        <FilterSection title="Date Posted" sectionKey="datePosted">
          <div className="space-y-2">
            {datePostedOptions.map(option => (
              <Checkbox
                key={option.value}
                checked={filters.datePosted === option.value}
                onChange={() => updateFilter('datePosted', option.value as any)}
                label={option.label}
              />
            ))}
          </div>
        </FilterSection>

        {/* Categories */}
        {categories.length > 0 && (
          <FilterSection title="Category" sectionKey="category">
            <select
              value={filters.category || ''}
              onChange={(e) => updateFilter('category', e.target.value || undefined)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </FilterSection>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center justify-center gap-2 w-full mt-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
