"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { User, Building2, Briefcase, Settings, Star, CheckCircle2, Github, Linkedin, LogOut } from "lucide-react";

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-bold">C</span>
            </div>
            <span className="text-white font-bold">CoStar</span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/jobs" className="text-slate-300 hover:text-white transition-colors">Jobs</Link>
              <Link href="#" className="text-slate-300 hover:text-white transition-colors">Companies</Link>
              <Link href="#" className="text-slate-300 hover:text-white transition-colors">Messages</Link>
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                  <span className="text-slate-900 font-bold">
                    {user.displayName?.[0] || user.email?.[0] || "U"}
                  </span>
                </div>
              )}
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user.displayName || "there"}!
          </h1>
          <p className="text-slate-400">Here's what's happening with your profile</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Profile Views", value: "0", icon: User, color: "amber" },
            { label: "Job Matches", value: "0", icon: Briefcase, color: "blue" },
            { label: "Verified Accounts", value: "0", icon: CheckCircle2, color: "green" },
            { label: "Profile Strength", value: "25%", icon: Star, color: "purple" },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
              <div className={`w-10 h-10 bg-${stat.color}-500/20 rounded-lg flex items-center justify-center mb-4`}>
                <stat.icon className={`text-${stat.color}-400`} size={20} />
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
              {[
                { label: "Basic Information", progress: 100, complete: true },
                { label: "Account Type", progress: 0, complete: false },
                { label: "Work Experience", progress: 0, complete: false },
                { label: "Education", progress: 0, complete: false },
                { label: "Social Connections", progress: 0, complete: false },
                { label: "Work Vibe Assessment", progress: 0, complete: false },
              ].map((item) => (
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
                { icon: Briefcase, label: "Browse Jobs", color: "amber", href: "/jobs" },
                { icon: Building2, label: "Post a Job", color: "green", href: "/dashboard/jobs" },
                { icon: Github, label: "Connect GitHub", color: "slate", href: "#" },
                { icon: Linkedin, label: "Import LinkedIn", color: "blue", href: "#" },
                { icon: Settings, label: "Account Settings", color: "slate", href: "#" },
              ].map((action) => (
                action.href.startsWith('/') ? (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-white hover:border-white/30 transition-colors flex items-center gap-3"
                  >
                    <action.icon className={`text-${action.color}-400`} size={18} />
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.label}
                    className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-white hover:border-white/30 transition-colors flex items-center gap-3"
                  >
                    <action.icon className={`text-${action.color}-400`} size={18} />
                    {action.label}
                  </button>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Recent Job Matches */}
        <div className="mt-8 bg-slate-800/50 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Top Job Matches</h2>
            <Link href="/jobs" className="text-amber-400 hover:text-amber-300 text-sm">
              View All →
            </Link>
          </div>
          <p className="text-slate-400 text-center py-8">
            Complete your profile to see AI-matched job opportunities
          </p>
        </div>
      </main>
    </div>
  );
}
