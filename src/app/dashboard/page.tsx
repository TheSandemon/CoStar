"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import NavHeader from "@/components/NavHeader";
import {
  accountTypeLabels,
  buildProfileChecklist,
  calculateProfileComplete,
  getUserProfile,
  type UserProfile,
} from "@/lib/profile";
import { User, Building2, Briefcase, Settings, Star, CheckCircle2, Github, Linkedin } from "lucide-react";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        return;
      }

      try {
        const loadedProfile = await getUserProfile(user.uid);
        if (loadedProfile?.accountType === "admin" || loadedProfile?.accountType === "owner") {
          router.push("/admin");
          return;
        }
        if (loadedProfile && !loadedProfile.accountType) {
          router.push("/onboarding");
          return;
        }
        setProfile(loadedProfile);
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };

    if (!loading) {
      loadProfile();
    }
  }, [user, loading, router]);

  const profileChecklist = useMemo(
    () => buildProfileChecklist(profile ?? user ?? null),
    [profile, user]
  );
  const profileComplete = calculateProfileComplete(profile ?? user ?? null);
  const connectedAccounts = profile?.socialConnections?.filter((connection) => connection.connected).length ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const accountType: UserProfile["accountType"] | null =
    profile?.accountType ?? (user.accountType as UserProfile["accountType"] | undefined) ?? null;
  const accountLabel = accountType ? accountTypeLabels[accountType] : "Account";
  const dashboardStats = getDashboardStats(accountType, profileComplete, connectedAccounts);
  const quickActions = getQuickActions(accountType);

  return (
    <div className="min-h-screen bg-slate-900">
      <NavHeader />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user.displayName || "there"}!
          </h1>
          <p className="text-slate-400">
            {profile?.headline || `${accountLabel} dashboard`}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {dashboardStats.map((stat) => (
            <div key={stat.label} className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
              <div className={`w-10 h-10 ${stat.bgClass} rounded-lg flex items-center justify-center mb-4`}>
                <stat.icon className={stat.iconClass} size={20} />
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-slate-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Profile Completeness */}
          <div className="md:col-span-2 bg-slate-800/50 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Profile Completeness</h2>

            <div className="space-y-4">
              {profileChecklist.map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white">{item.label}</span>
                      {item.complete ? (
                        <CheckCircle2 className="text-green-400" size={16} />
                      ) : (
                        <span className="text-slate-500 text-sm">{item.progress}%</span>
                      )}
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push("/onboarding")}
              className="mt-6 w-full py-3 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors"
            >
              Complete Your Profile
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>

            <div className="space-y-3">
              {[
                ...quickActions,
                { icon: Settings, label: "Account Settings", iconClass: "text-slate-400", href: "/dashboard/settings" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-white hover:border-white/30 transition-colors flex items-center gap-3"
                >
                  <action.icon className={action.iconClass} size={18} />
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-slate-800/50 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">{accountType === "business" ? "Hiring Activity" : accountType === "agency" ? "Agency Activity" : "Top Job Matches"}</h2>
            <Link href={accountType === "business" ? "/dashboard/jobs" : "/jobs"} className="text-amber-400 hover:text-amber-300 text-sm">
              View All →
            </Link>
          </div>
          <p className="text-slate-400 text-center py-8">
            {getDashboardEmptyState(accountType, profileComplete)}
          </p>
        </div>
      </main>
    </div>
  );
}

function getDashboardStats(accountType: UserProfile["accountType"] | null, profileComplete: number, connectedAccounts: number) {
  if (accountType === "business") {
    return [
      { label: "Company Views", value: "0", icon: Building2, bgClass: "bg-blue-500/20", iconClass: "text-blue-400" },
      { label: "Job Posts", value: "0", icon: Briefcase, bgClass: "bg-amber-500/20", iconClass: "text-amber-400" },
      { label: "Applicants", value: "0", icon: User, bgClass: "bg-green-500/20", iconClass: "text-green-400" },
      { label: "Profile Strength", value: `${profileComplete}%`, icon: Star, bgClass: "bg-purple-500/20", iconClass: "text-purple-400" },
    ];
  }

  if (accountType === "agency") {
    return [
      { label: "Agency Views", value: "0", icon: Building2, bgClass: "bg-purple-500/20", iconClass: "text-purple-400" },
      { label: "Candidates", value: "0", icon: User, bgClass: "bg-amber-500/20", iconClass: "text-amber-400" },
      { label: "Auditions", value: "0", icon: Briefcase, bgClass: "bg-blue-500/20", iconClass: "text-blue-400" },
      { label: "Profile Strength", value: `${profileComplete}%`, icon: Star, bgClass: "bg-green-500/20", iconClass: "text-green-400" },
    ];
  }

  return [
    { label: "Profile Views", value: "0", icon: User, bgClass: "bg-amber-500/20", iconClass: "text-amber-400" },
    { label: "Job Matches", value: "0", icon: Briefcase, bgClass: "bg-blue-500/20", iconClass: "text-blue-400" },
    { label: "Verified Accounts", value: String(connectedAccounts), icon: CheckCircle2, bgClass: "bg-green-500/20", iconClass: "text-green-400" },
    { label: "Profile Strength", value: `${profileComplete}%`, icon: Star, bgClass: "bg-purple-500/20", iconClass: "text-purple-400" },
  ];
}

function getQuickActions(accountType: UserProfile["accountType"] | null) {
  if (accountType === "business") {
    return [
      { icon: Building2, label: "Edit Company Profile", iconClass: "text-blue-400", href: "/dashboard/settings" },
      { icon: Briefcase, label: "Post a Job", iconClass: "text-green-400", href: "/dashboard/jobs" },
    ];
  }

  if (accountType === "agency") {
    return [
      { icon: User, label: "Edit Agency Profile", iconClass: "text-purple-400", href: "/dashboard/settings" },
      { icon: Briefcase, label: "Browse Jobs", iconClass: "text-amber-400", href: "/jobs" },
    ];
  }

  return [
    { icon: Briefcase, label: "Browse Jobs", iconClass: "text-amber-400", href: "/jobs" },
    { icon: Github, label: "Connect GitHub", iconClass: "text-slate-400", href: "/dashboard/settings#connections" },
    { icon: Linkedin, label: "Import LinkedIn", iconClass: "text-blue-400", href: "/dashboard/settings#connections" },
  ];
}

function getDashboardEmptyState(accountType: UserProfile["accountType"] | null, profileComplete: number): string {
  if (accountType === "business") {
    return profileComplete < 80
      ? "Complete your company profile to publish a stronger employer presence."
      : "Job posting and candidate activity will appear here.";
  }

  if (accountType === "agency") {
    return profileComplete < 80
      ? "Complete your agency profile to show candidates and clients what you offer."
      : "Candidate coaching and placement activity will appear here.";
  }

  return profileComplete < 80
    ? "Complete your profile to see AI-matched job opportunities"
    : "Job match recommendations will appear here as matching is expanded.";
}
