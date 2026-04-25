"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Building2, ExternalLink, MapPin, User, Users2 } from "lucide-react";
import { accountTypeLabels, type UserProfile } from "@/lib/profile";
import ProfileCTA from "./ProfileCTA";

interface PublicProfileViewProps {
  profile: UserProfile;
}

export default function PublicProfileView({ profile }: PublicProfileViewProps) {
  const accountType = profile.accountType ?? "talent";
  const business = profile.businessProfile;
  const agency = profile.agencyProfile;
  const displayName =
    accountType === "business"
      ? business?.companyName || profile.displayName
      : accountType === "agency"
      ? agency?.agencyName || profile.displayName
      : profile.displayName;
  const headline =
    accountType === "business"
      ? business?.description || profile.headline
      : accountType === "agency"
      ? agency?.description || profile.headline
      : profile.headline;
  const location =
    accountType === "business"
      ? [business?.headquarters?.city, business?.headquarters?.state, business?.headquarters?.country].filter(Boolean).join(", ")
      : accountType === "agency"
      ? agency?.location || profile.location
      : profile.location;
  const Icon = accountType === "business" ? Building2 : accountType === "agency" ? Users2 : User;

  return (
    <div className="min-h-screen bg-slate-900">
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Link href="/" className="text-sm text-amber-400 hover:text-amber-300">
          Back to CoStar
        </Link>

        <section className="mt-8 border-b border-white/10 pb-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-800">
              <Icon className="h-10 w-10 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-3 inline-flex rounded-full border border-white/10 bg-slate-800 px-3 py-1 text-sm text-slate-300">
                {accountTypeLabels[accountType]}
              </div>
              <h1 className="text-4xl font-bold text-white">{displayName || "CoStar Profile"}</h1>
              {headline && <p className="mt-3 max-w-3xl text-lg text-slate-300">{headline}</p>}
              {location && (
                <div className="mt-4 flex items-center gap-2 text-slate-400">
                  <MapPin className="h-4 w-4" />
                  <span>{location}</span>
                </div>
              )}
              <div className="mt-6">
                <ProfileCTA targetId={profile.uid} targetRole={accountType} />
              </div>
            </div>
          </div>
        </section>

        {accountType === "business" && business && (
          <div className="grid gap-6 py-8 md:grid-cols-2">
            <ProfileSection title="Company Details">
              <Fact label="Size" value={business.companySize} />
              <Fact label="Hiring Goals" value={business.hiringGoals} />
              {business.website && <ExternalLinkRow href={business.website} label="Company website" />}
            </ProfileSection>
            <ProfileSection title="Culture">
              <Fact label="Values" value={business.culture?.values} />
              <TagList tags={business.culture?.tags ?? []} />
            </ProfileSection>
          </div>
        )}

        {accountType === "agency" && agency && (
          <div className="grid gap-6 py-8 md:grid-cols-2">
            <ProfileSection title="Services">
              <TagList tags={agency.services ?? []} />
              {agency.website && <ExternalLinkRow href={agency.website} label="Agency website" />}
            </ProfileSection>
            <ProfileSection title="Specialties">
              <TagList tags={[...(agency.specialties ?? []), ...(agency.industries ?? [])]} />
            </ProfileSection>
          </div>
        )}

        {accountType === "talent" && (
          <div className="grid gap-6 py-8 md:grid-cols-2">
            <ProfileSection title="Work Vibe">
              <TagList tags={[...(profile.workVibe?.style ?? []), ...(profile.workVibe?.culture ?? [])]} />
              <Fact label="Values" value={profile.workVibe?.values} />
            </ProfileSection>
            <ProfileSection title="Verified Links">
              <TagList tags={(profile.socialConnections ?? []).filter((item) => item.connected).map((item) => item.label || item.platform)} />
            </ProfileSection>
          </div>
        )}
      </main>
    </div>
  );
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-800/50 p-6">
      <h2 className="mb-4 text-xl font-bold text-white">{title}</h2>
      <div className="space-y-3 text-slate-300">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-sm text-slate-500">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <p className="text-slate-500">No public details yet.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1 text-sm text-slate-300">
          {tag}
        </span>
      ))}
    </div>
  );
}

function ExternalLinkRow({ href, label }: { href: string; label: string }) {
  const normalizedHref = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={normalizedHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300"
    >
      {label}
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}
