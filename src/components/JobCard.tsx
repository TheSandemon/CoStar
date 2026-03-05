'use client';

import { JobData } from '@/lib/jobs';
import { MapPin, Clock, DollarSign, Briefcase, Globe, Bookmark, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface JobCardProps {
  job: JobData;
  showCompany?: boolean;
  onSave?: (jobId: string) => void;
  onApply?: (jobId: string) => void;
}

export default function JobCard({ job, showCompany = true, onSave, onApply }: JobCardProps) {
  const [saved, setSaved] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const formatSalary = () => {
    if (!job.salary?.visible || !job.salary?.min && !job.salary?.max) return null;

    const currency = job.salary.currency || 'USD';
    const formatNumber = (num: number) => {
      if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
      return num.toString();
    };

    const min = job.salary.min ? formatNumber(job.salary.min) : '';
    const max = job.salary.max ? formatNumber(job.salary.max) : '';

    return `${currency} ${min}${min && max ? ' - ' : ''}${max}${job.salary.period === 'yearly' ? '/yr' : job.salary.period === 'monthly' ? '/mo' : '/hr'}`;
  };

  const formatDate = () => {
    if (!job.createdAt) return '';

    let date;
    if (job.createdAt.toDate) {
      date = job.createdAt.toDate();
    } else {
      date = new Date(job.createdAt);
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getRemoteBadgeClass = () => {
    switch (job.location?.remotePolicy) {
      case 'remote':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'hybrid':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'onsite':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved(!saved);
    onSave?.(job.jobId!);
  };

  const handleApply = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onApply?.(job.jobId!);
  };

  const salary = formatSalary();

  return (
    <Link href={`/jobs/${job.slug}`}>
      <div
        className="group bg-slate-800/50 border border-white/10 rounded-xl p-5 hover:border-amber-500/30 hover:bg-slate-800/80 transition-all duration-300 cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start gap-4">
          {/* Company Logo */}
          {showCompany && job.companyName && (
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center border border-white/10">
              <span className="text-amber-400 font-bold text-lg">
                {job.companyName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-white font-semibold text-lg group-hover:text-amber-400 transition-colors truncate">
                  {job.title}
                </h3>
                {showCompany && job.companyName && (
                  <p className="text-slate-400 text-sm">{job.companyName}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={handleSave}
                  className={`p-2 rounded-lg transition-colors ${
                    saved
                      ? 'text-amber-400 bg-amber-400/10'
                      : 'text-slate-400 hover:text-amber-400 hover:bg-slate-700'
                  }`}
                  title={saved ? 'Saved' : 'Save job'}
                >
                  <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-400">
              {/* Location */}
              {(job.location?.city || job.location?.country) && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {[job.location.city, job.location.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              {/* Remote Badge */}
              {job.location?.remotePolicy && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRemoteBadgeClass()}`}>
                  {job.location.remotePolicy === 'remote'
                    ? 'Remote'
                    : job.location.remotePolicy === 'hybrid'
                    ? 'Hybrid'
                    : 'On-site'}
                </span>
              )}

              {/* Job Type */}
              {job.employment?.type && (
                <div className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  <span className="capitalize">{job.employment.type.replace('-', ' ')}</span>
                </div>
              )}

              {/* Experience Level */}
              {job.employment?.experienceLevel && (
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  <span className="capitalize">{job.employment.experienceLevel}</span>
                </div>
              )}

              {/* Salary */}
              {salary && (
                <div className="flex items-center gap-1 text-green-400">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-medium">{salary}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {job.tags && job.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {job.tags.slice(0, 4).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-lg"
                  >
                    {tag}
                  </span>
                ))}
                {job.tags.length > 4 && (
                  <span className="px-2 py-1 text-slate-500 text-xs">
                    +{job.tags.length - 4} more
                  </span>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center gap-1 text-slate-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>{formatDate()}</span>
              </div>

              {job.application?.method && (
                <button
                  onClick={handleApply}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-sm font-medium transition-colors"
                >
                  Apply
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
