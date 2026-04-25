"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Eye, EyeOff, Loader2, Shield, UserCog, Users } from "lucide-react";
import NavHeader from "@/components/NavHeader";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";

interface AdminSummary {
  counts: {
    totalUsers: number;
    user: number;
    business: number;
    agency: number;
    admin: number;
    owner: number;
    suspended: number;
    jobs: number;
    scrapedJobs: number;
  };
  recentUsers: AdminUser[];
}

interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string;
  accountType: string | null;
  accountTypeLocked: boolean;
  publicProfileEnabled: boolean;
  moderationStatus: "active" | "suspended";
  disabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  const isPrivileged = user?.accountType === "admin" || user?.accountType === "owner";
  const isOwner = user?.accountType === "owner";

  useEffect(() => {
    if (!loading && !user) router.push("/sign-in");
    if (!loading && user && !isPrivileged) router.push("/dashboard");
  }, [isPrivileged, loading, router, user]);

  const fetchSummary = useCallback(async () => {
    if (!auth?.currentUser) return;

    setIsLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(await response.text());
      setSummary(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load admin summary.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPrivileged) fetchSummary();
  }, [fetchSummary, isPrivileged]);

  async function callAdminApi(path: string, body: Record<string, unknown>, success: string) {
    if (!auth?.currentUser) return;

    setIsActing(true);
    setError(null);
    setMessage(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(path, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await response.text());
      setMessage(success);
      await fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin action failed.");
    } finally {
      setIsActing(false);
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user || !isPrivileged) return null;

  const counts = summary?.counts;

  return (
    <div className="min-h-screen bg-slate-900">
      <NavHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-300">
              <Shield className="h-4 w-4" />
              {isOwner ? "Owner" : "Admin"}
            </div>
            <h1 className="text-3xl font-bold text-white">Admin Console</h1>
            <p className="text-slate-400">Platform overview, role management, and account moderation.</p>
          </div>
          <button
            onClick={fetchSummary}
            disabled={isActing}
            className="rounded-xl bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        {(message || error) && (
          <div className={`mb-6 rounded-xl border p-4 ${error ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-green-500/30 bg-green-500/10 text-green-300"}`}>
            {error || message}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          {[
            { label: "Total Users", value: counts?.totalUsers ?? 0, icon: Users },
            { label: "Admins", value: (counts?.admin ?? 0) + (counts?.owner ?? 0), icon: Shield },
            { label: "Suspended", value: counts?.suspended ?? 0, icon: UserCog },
            { label: "Jobs", value: (counts?.jobs ?? 0) + (counts?.scrapedJobs ?? 0), icon: BarChart3 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-slate-800/50 p-5">
              <stat.icon className="mb-3 h-6 w-6 text-amber-400" />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-5">
          {[
            ["Job Seekers", counts?.user ?? 0],
            ["Businesses", counts?.business ?? 0],
            ["Agencies", counts?.agency ?? 0],
            ["Admins", counts?.admin ?? 0],
            ["Owners", counts?.owner ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-slate-800/30 p-4">
              <div className="text-xl font-bold text-white">{value}</div>
              <div className="text-sm text-slate-400">{label}</div>
            </div>
          ))}
        </div>

        {isOwner && (
          <section className="mb-8 rounded-xl border border-white/10 bg-slate-800/50 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Owner Role Management</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                placeholder="person@example.com"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={() => callAdminApi("/api/admin/users/set-role", { email: adminEmail, action: "promote-admin" }, "Admin promoted.")}
                disabled={isActing || !adminEmail.trim()}
                className="rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-900 hover:bg-amber-400 disabled:opacity-60"
              >
                Promote Admin
              </button>
              <button
                onClick={() => callAdminApi("/api/admin/users/set-role", { email: adminEmail, action: "demote-admin" }, "Admin demoted.")}
                disabled={isActing || !adminEmail.trim()}
                className="rounded-xl bg-slate-700 px-5 py-3 font-bold text-white hover:bg-slate-600 disabled:opacity-60"
              >
                Demote Admin
              </button>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-white/10 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-xl font-bold text-white">Recent Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4">User</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Public</th>
                  <th className="py-3 pr-4">Updated</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.recentUsers ?? []).map((row) => (
                  <tr key={row.uid} className="border-b border-white/5 text-slate-300">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-white">{row.displayName || "Unnamed"}</div>
                      <div className="text-slate-500">{row.email}</div>
                    </td>
                    <td className="py-3 pr-4 capitalize">{row.accountType ?? "none"}</td>
                    <td className="py-3 pr-4">
                      <span className={row.moderationStatus === "suspended" ? "text-red-300" : "text-green-300"}>
                        {row.moderationStatus}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{row.publicProfileEnabled ? "Visible" : "Hidden"}</td>
                    <td className="py-3 pr-4">{formatDate(row.updatedAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => callAdminApi("/api/admin/users/set-status", {
                            uid: row.uid,
                            moderationStatus: row.moderationStatus === "suspended" ? "active" : "suspended",
                          }, row.moderationStatus === "suspended" ? "User reactivated." : "User suspended.")}
                          disabled={isActing || row.accountType === "owner"}
                          className="rounded-lg bg-slate-700 px-3 py-2 text-white hover:bg-slate-600 disabled:opacity-40"
                        >
                          {row.moderationStatus === "suspended" ? "Reactivate" : "Suspend"}
                        </button>
                        <button
                          onClick={() => callAdminApi("/api/admin/users/set-status", {
                            uid: row.uid,
                            publicProfileEnabled: !row.publicProfileEnabled,
                          }, row.publicProfileEnabled ? "Profile hidden." : "Profile visible.")}
                          disabled={isActing}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-white hover:bg-slate-600 disabled:opacity-40"
                        >
                          {row.publicProfileEnabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          {row.publicProfileEnabled ? "Hide" : "Show"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
