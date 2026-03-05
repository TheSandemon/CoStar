'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getJobBySlug, JobData, incrementJobMetric } from '@/lib/jobs';
import { getCompanyById, CompanyData } from '@/lib/companies';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  Briefcase,
  Globe,
  Bookmark,
  Share2,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  Building2,
} from 'lucide-react';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [job, setJob] = useState<JobData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      if (!slug) return;

      setIsLoading(true);
      setError(null);

      try {
        const jobData = await getJobBySlug(slug);

        if (!jobData) {
          setError('Job not found');
          setIsLoading(false);
          return;
        }

        setJob(jobData);

        // Track view
        if (jobData.jobId) {
          await incrementJobMetric(jobData.jobId, 'views');
        }

        // Load company if exists
        if (jobData.companyId) {
          const companyData = await getCompanyById(jobData.companyId);
          setCompany(companyData);
        }
      } catch (err) {
        setError('Failed to load job details');
        console.error('Error loading job:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadJob();
  }, [slug]);

  const formatSalary = () => {
    if (!job?.salary?.visible || (!job.salary?.min && !job.salary?.max)) return 'Salary not disclosed';

    const currency = job.salary.currency || 'USD';
    const formatNumber = (num: number) => {
      if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
      return `$${num}`;
    };

    const min = job.salary.min ? formatNumber(job.salary.min) : '';
    const max = job.salary.max ? formatNumber(job.salary.max) : '';

    return `${min}${min && max ? ' - ' : ''}${max} /${job.salary.period === 'yearly' ? 'yr' : job.salary.period === 'monthly' ? 'mo' : 'hr'}`;
  };

  const formatDate = () => {
    if (!job?.createdAt) return '';

    let date;
    if (job.createdAt.toDate) {
      date = job.createdAt.toDate();
    } else {
      date = new Date(job.createdAt);
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleApply = () => {
    if (job?.application?.method === 'external' && job.application.url) {
      window.open(job.application.url, '_blank');
    } else if (job?.application?.method === 'email' && job.application.email) {
      window.location.href = `mailto:${job.application.email}`;
    } else {
      setApplied(true);
    }
  };

  const handleSave = () => {
    setSaved(!saved);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Job not found</h2>
          <p className="text-slate-400 mb-6">{error || 'This job may have been removed'}</p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to jobs
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">{job.title}</h1>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-medium text-amber-400">{job.companyName}</span>
                    {job.employment?.experienceLevel && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{job.employment.experienceLevel}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    className={`p-3 rounded-xl border transition-colors ${
                      saved
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
                  </button>
                  <button className="p-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 mt-6 pt-6 border-t border-white/10">
                {(job.location?.city || job.location?.country) && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>
                      {[job.location.city, job.location.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}

                {job.location?.remotePolicy && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    job.location.remotePolicy === 'remote'
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : job.location.remotePolicy === 'hybrid'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }`}>
                    {job.location.remotePolicy === 'remote'
                      ? 'Remote'
                      : job.location.remotePolicy === 'hybrid'
                      ? 'Hybrid'
                      : 'On-site'}
                  </span>
                )}

                {job.employment?.type && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    <span className="capitalize">{job.employment.type.replace('-', ' ')}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Posted {formatDate()}</span>
                </div>

                <div className="flex items-center gap-2 text-green-400 font-medium">
                  <DollarSign className="w-4 h-4" />
                  <span>{formatSalary()}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-4">About this role</h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>

            {/* Skills */}
            {job.skills && ((job.skills.required?.length ?? 0) > 0 || (job.skills.preferred?.length ?? 0) > 0) && (
              <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
                <h2 className="text-white font-semibold text-lg mb-4">Skills & Requirements</h2>

                {(job.skills.required?.length ?? 0) > 0 && (
                  <div className="mb-4">
                    <h3 className="text-slate-400 text-sm font-medium mb-2">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.skills?.required?.map(skill => (
                        <span
                          key={skill}
                          className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(job.skills.preferred?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="text-slate-400 text-sm font-medium mb-2">Nice to Have</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.skills?.preferred?.map(skill => (
                        <span
                          key={skill}
                          className="px-3 py-1.5 bg-slate-700/50 text-slate-300 border border-white/10 rounded-lg text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {(job.tags?.length ?? 0) > 0 && (
              <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
                <h2 className="text-white font-semibold text-lg mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {job.tags?.map(tag => (
                    <Link
                      key={tag}
                      href={`/jobs?tag=${encodeURIComponent(tag)}`}
                      className="px-3 py-1.5 bg-slate-700/50 text-slate-300 border border-white/10 rounded-lg text-sm hover:border-amber-500/30 transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Screening Process */}
            {job.screening?.stages && (job.screening.stages.length ?? 0) > 0 && (
              <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
                <h2 className="text-white font-semibold text-lg mb-4">Interview Process</h2>
                <div className="space-y-3">
                  {job.screening?.stages?.map((stage, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="text-slate-300 capitalize">{stage.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 sticky top-4">
              {applied ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <h3 className="text-white font-semibold mb-1">Application Submitted!</h3>
                  <p className="text-slate-400 text-sm">
                    Good luck with your application
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleApply}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-900 rounded-xl font-bold mb-4"
                  >
                    {job.application?.method === 'external' ? (
                      <>
                        Apply on Company Site
                        <ExternalLink className="w-4 h-4" />
                      </>
                    ) : job.application?.method === 'email' ? (
                      <>
                        Apply via Email
                        <ExternalLink className="w-4 h-4" />
                      </>
                    ) : (
                      'Apply Now'
                    )}
                  </button>
                  <p className="text-slate-400 text-sm text-center">
                    {job.application?.resumeRequired && 'Resume required'}
                    {job.application?.resumeRequired && job.application?.coverLetterRequired && ' • '}
                    {job.application?.coverLetterRequired && 'Cover letter required'}
                  </p>
                </>
              )}

              {/* Quick Info */}
              <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-3 text-slate-400">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">
                    {job.metrics?.applications || 0} applicants
                  </span>
                </div>
                {job.employment?.type && (
                  <div className="flex items-center gap-3 text-slate-400">
                    <Briefcase className="w-4 h-4" />
                    <span className="text-sm capitalize">{job.employment.type.replace('-', ' ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Company Card */}
            {company && (
              <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">About {company.name}</h3>

                {company.tagline && (
                  <p className="text-slate-400 text-sm mb-4">{company.tagline}</p>
                )}

                {company.description && (
                  <p className="text-slate-300 text-sm mb-4 line-clamp-4">
                    {company.description}
                  </p>
                )}

                <div className="space-y-3 text-sm">
                  {company.companySize && (
                    <div className="flex items-center gap-3 text-slate-400">
                      <Users className="w-4 h-4" />
                      <span>{company.companySize} employees</span>
                    </div>
                  )}

                  {company.headquarters && (
                    <div className="flex items-center gap-3 text-slate-400">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {[company.headquarters.city, company.headquarters.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}

                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-amber-400 hover:text-amber-300"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Visit website</span>
                    </a>
                  )}
                </div>

                {company.culture?.perks && (company.culture.perks.length ?? 0) > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <h4 className="text-slate-400 text-sm mb-2">Perks & Benefits</h4>
                    <div className="flex flex-wrap gap-2">
                      {company.culture?.perks?.slice(0, 4).map(perk => (
                        <span
                          key={perk}
                          className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-lg"
                        >
                          {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Similar Jobs Link */}
            <Link
              href="/jobs"
              className="block text-center text-amber-400 hover:text-amber-300 text-sm"
            >
              ← Browse more jobs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
