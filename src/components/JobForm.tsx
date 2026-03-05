'use client';

import { JobData, generateSlug } from '@/lib/jobs';
import { CompanyData } from '@/lib/companies';
import { Save, X, Plus, Trash2, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface JobFormProps {
  job?: JobData;
  company?: CompanyData;
  employerId: string;
  onSubmit: (jobData: JobData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function JobForm({ job, company, employerId, onSubmit, onCancel, isLoading }: JobFormProps) {
  const [formData, setFormData] = useState<JobData>({
    title: job?.title || '',
    slug: job?.slug || '',
    description: job?.description || '',
    shortDescription: job?.shortDescription || '',
    companyId: job?.companyId || company?.companyId || '',
    companyName: job?.companyName || company?.name || '',
    category: job?.category || '',
    tags: job?.tags || [],
    location: job?.location || {
      city: company?.headquarters?.city || '',
      state: company?.headquarters?.state || '',
      country: company?.headquarters?.country || '',
      remotePolicy: 'hybrid',
    },
    salary: job?.salary || {
      visible: true,
      currency: 'USD',
      period: 'yearly',
    },
    employment: job?.employment || {
      type: 'full-time',
      experienceLevel: 'mid',
      urgency: 'flexible',
    },
    skills: job?.skills || {
      required: [],
      preferred: [],
      tools: [],
      certifications: [],
      languages: [],
    },
    education: job?.education || [],
    experience: job?.experience || {
      yearsMin: 0,
      yearsMax: 10,
    },
    vibeMatch: job?.vibeMatch || {
      workStyle: [],
      culture: [],
      perks: [],
      benefits: [],
    },
    application: job?.application || {
      method: 'platform',
      resumeRequired: true,
      coverLetterRequired: false,
      portfolioRequired: false,
    },
    screening: job?.screening || {
      stages: ['resume', 'phone', 'onsite'],
      interviewRounds: 3,
    },
    status: job?.status || 'draft',
    visibility: job?.visibility || 'public',
  });

  const [tagInput, setTagInput] = useState('');
  const [requiredSkillInput, setRequiredSkillInput] = useState('');
  const [preferredSkillInput, setPreferredSkillInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (section: string, field: string, value: any) => {
    if (section === 'root') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev as any)[section],
          [field]: value,
        },
      }));
    }
    // Clear error when field is edited
    if (errors[`${section}.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${section}.${field}`];
        return newErrors;
      });
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      handleChange('root', 'tags', [...(formData.tags || []), tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    handleChange('root', 'tags', formData.tags?.filter(t => t !== tag) || []);
  };

  const addRequiredSkill = () => {
    if (requiredSkillInput.trim() && !formData.skills?.required?.includes(requiredSkillInput.trim())) {
      handleChange('skills', 'required', [...(formData.skills?.required || []), requiredSkillInput.trim()]);
      setRequiredSkillInput('');
    }
  };

  const removeRequiredSkill = (skill: string) => {
    handleChange('skills', 'required', formData.skills?.required?.filter(s => s !== skill) || []);
  };

  const addPreferredSkill = () => {
    if (preferredSkillInput.trim() && !formData.skills?.preferred?.includes(preferredSkillInput.trim())) {
      handleChange('skills', 'preferred', [...(formData.skills?.preferred || []), preferredSkillInput.trim()]);
      setPreferredSkillInput('');
    }
  };

  const removePreferredSkill = (skill: string) => {
    handleChange('skills', 'preferred', formData.skills?.preferred?.filter(s => s !== skill) || []);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors['title'] = 'Job title is required';
    }

    if (!formData.description?.trim()) {
      newErrors['description'] = 'Job description is required';
    }

    if (!formData.category?.trim()) {
      newErrors['category'] = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Generate slug if not provided
    const jobData = {
      ...formData,
      slug: formData.slug || generateSlug(formData.title || ''),
      employerId,
    };

    await onSubmit(jobData);
  };

  const Input = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-white text-sm font-medium mb-2">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );

  const Select = ({
    label,
    value,
    onChange,
    options,
    section = 'root',
    field,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    section?: string;
    field: string;
  }) => (
    <Input label={label}>
      <select
        value={value}
        onChange={(e) => handleChange(section, field, e.target.value)}
        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </Input>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-semibold text-lg mb-4">Basic Information</h3>
        <div className="space-y-4">
          <Input label="Job Title *" error={errors['title']}>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('root', 'title', e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </Input>

          <Input label="Short Description">
            <input
              type="text"
              value={formData.shortDescription}
              onChange={(e) => handleChange('root', 'shortDescription', e.target.value)}
              placeholder="Brief summary of the role (1-2 sentences)"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </Input>

          <Input label="Full Description *" error={errors['description']}>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('root', 'description', e.target.value)}
              placeholder="Detailed job description..."
              rows={6}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
            />
          </Input>

          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Category *">
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleChange('root', 'category', e.target.value)}
                placeholder="e.g. Engineering, Marketing, Sales"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </Input>

            <Select
              label="Employment Type"
              value={formData.employment?.type || 'full-time'}
              onChange={(v) => handleChange('employment', 'type', v)}
              options={[
                { value: 'full-time', label: 'Full-time' },
                { value: 'part-time', label: 'Part-time' },
                { value: 'contract', label: 'Contract' },
                { value: 'internship', label: 'Internship' },
                { value: 'temporary', label: 'Temporary' },
                { value: 'freelance', label: 'Freelance' },
              ]}
              section="employment"
              field="type"
            />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-semibold text-lg mb-4">Location</h3>
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Input label="City">
              <input
                type="text"
                value={formData.location?.city}
                onChange={(e) => handleChange('location', 'city', e.target.value)}
                placeholder="San Francisco"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </Input>
            <Input label="State/Province">
              <input
                type="text"
                value={formData.location?.state}
                onChange={(e) => handleChange('location', 'state', e.target.value)}
                placeholder="California"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </Input>
            <Input label="Country">
              <input
                type="text"
                value={formData.location?.country}
                onChange={(e) => handleChange('location', 'country', e.target.value)}
                placeholder="USA"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </Input>
          </div>

          <Select
            label="Remote Policy"
            value={formData.location?.remotePolicy || 'hybrid'}
            onChange={(v) => handleChange('location', 'remotePolicy', v)}
            options={[
              { value: 'remote', label: 'Remote' },
              { value: 'hybrid', label: 'Hybrid' },
              { value: 'onsite', label: 'On-site' },
              { value: 'flexible', label: 'Flexible' },
            ]}
            section="location"
            field="remotePolicy"
          />
        </div>
      </div>

      {/* Salary */}
      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-semibold text-lg mb-4">Compensation</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="salaryVisible"
              checked={formData.salary?.visible}
              onChange={(e) => handleChange('salary', 'visible', e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="salaryVisible" className="text-slate-300 text-sm">Show salary publicly</label>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Input label="Min Salary">
              <input
                type="number"
                value={formData.salary?.min}
                onChange={(e) => handleChange('salary', 'min', Number(e.target.value))}
                placeholder="50000"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </Input>
            <Input label="Max Salary">
              <input
                type="number"
                value={formData.salary?.max}
                onChange={(e) => handleChange('salary', 'max', Number(e.target.value))}
                placeholder="80000"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </Input>
            <Select
              label="Period"
              value={formData.salary?.period || 'yearly'}
              onChange={(v) => handleChange('salary', 'period', v)}
              options={[
                { value: 'hourly', label: 'Hourly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
              section="salary"
              field="period"
            />
          </div>

          <Select
            label="Currency"
            value={formData.salary?.currency || 'USD'}
            onChange={(v) => handleChange('salary', 'currency', v)}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
              { value: 'CAD', label: 'CAD' },
              { value: 'AUD', label: 'AUD' },
            ]}
            section="salary"
            field="currency"
          />
        </div>
      </div>

      {/* Skills */}
      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-semibold text-lg mb-4">Skills & Requirements</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Required Skills</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={requiredSkillInput}
                onChange={(e) => setRequiredSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequiredSkill())}
                placeholder="Add required skill"
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={addRequiredSkill}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-medium"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.skills?.required?.map(skill => (
                <span key={skill} className="flex items-center gap-1 px-3 py-1 bg-slate-700 text-white text-sm rounded-lg">
                  {skill}
                  <button type="button" onClick={() => removeRequiredSkill(skill)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Preferred Skills</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={preferredSkillInput}
                onChange={(e) => setPreferredSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPreferredSkill())}
                placeholder="Add preferred skill"
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={addPreferredSkill}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.skills?.preferred?.map(skill => (
                <span key={skill} className="flex items-center gap-1 px-3 py-1 bg-slate-700/50 text-slate-300 text-sm rounded-lg">
                  {skill}
                  <button type="button" onClick={() => removePreferredSkill(skill)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-semibold text-lg mb-4">Tags</h3>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add searchable tag"
            className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-medium"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags?.map(tag => (
            <span key={tag} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-white text-sm rounded-lg">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Application */}
      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-semibold text-lg mb-4">Application Process</h3>
        <div className="space-y-4">
          <Select
            label="Application Method"
            value={formData.application?.method || 'platform'}
            onChange={(v) => handleChange('application', 'method', v)}
            options={[
              { value: 'platform', label: 'Through CoStar Platform' },
              { value: 'email', label: 'Direct Email' },
              { value: 'external', label: 'External URL' },
              { value: 'referral', label: 'Referral Only' },
            ]}
            section="application"
            field="method"
          />

          {(formData.application?.method === 'email' || formData.application?.method === 'external') && (
            <Input label={formData.application.method === 'email' ? 'Application Email' : 'Application URL'}>
              <input
                type={formData.application.method === 'email' ? 'email' : 'url'}
                value={formData.application?.email || formData.application?.url}
                onChange={(e) => handleChange('application', formData.application?.method === 'email' ? 'email' : 'url', e.target.value)}
                placeholder={formData.application.method === 'email' ? 'jobs@company.com' : 'https://careers.company.com/job/123'}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </Input>
          )}

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={formData.application?.resumeRequired}
                onChange={(e) => handleChange('application', 'resumeRequired', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
              />
              Resume Required
            </label>
            <label className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={formData.application?.coverLetterRequired}
                onChange={(e) => handleChange('application', 'coverLetterRequired', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
              />
              Cover Letter
            </label>
            <label className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={formData.application?.portfolioRequired}
                onChange={(e) => handleChange('application', 'portfolioRequired', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
              />
              Portfolio
            </label>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-semibold text-lg mb-4">Visibility</h3>
        <div className="space-y-4">
          <Select
            label="Job Status"
            value={formData.status || 'draft'}
            onChange={(v) => handleChange('root', 'status', v)}
            options={[
              { value: 'draft', label: 'Draft - Not visible' },
              { value: 'active', label: 'Active - Visible to all' },
              { value: 'paused', label: 'Paused - Not accepting applications' },
            ]}
            section="root"
            field="status"
          />

          <Select
            label="Visibility"
            value={formData.visibility || 'public'}
            onChange={(v) => handleChange('root', 'visibility', v)}
            options={[
              { value: 'public', label: 'Public - Searchable' },
              { value: 'unlisted', label: 'Unlisted - Direct link only' },
              { value: 'private', label: 'Private - Invitation only' },
            ]}
            section="root"
            field="visibility"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-medium disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {isLoading ? 'Saving...' : job ? 'Update Job' : 'Create Job'}
        </button>
      </div>
    </form>
  );
}
