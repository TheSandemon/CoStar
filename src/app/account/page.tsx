"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Shield, User } from "lucide-react";
import NavHeader from "@/components/NavHeader";
import { useAuth } from "@/context/AuthContext";
import { accountTypeLabels, isPrivilegedAccountType } from "@/lib/profile";

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const isOperator = isPrivilegedAccountType(user?.accountType);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
    } else if (!loading && user && !isOperator) {
      router.push(user.accountType ? "/dashboard/settings" : "/onboarding");
    }
  }, [isOperator, loading, router, user]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isOperator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <NavHeader />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-300">
            <Shield className="h-4 w-4" />
            {accountTypeLabels[user.accountType as "admin" | "owner"]}
          </div>
          <h1 className="text-3xl font-bold text-white">Account</h1>
          <p className="text-slate-400">Your operator account is separate from public Talent, Employer, and Agency profiles.</p>
        </div>

        <section className="mb-6 rounded-xl border border-white/10 bg-slate-800/50 p-6">
          <h2 className="mb-6 text-xl font-bold text-white">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Name" value={user.displayName || "Not set"} />
            <Info label="Email" value={user.email || "Not set"} />
            <Info label="Role" value={accountTypeLabels[user.accountType as "admin" | "owner"]} />
            <Info label="Public account path" value="None" />
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-white/10 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-xl font-bold text-white">Operator Tools</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900 p-4 text-white transition-colors hover:border-amber-500/50"
            >
              <Shield className="h-5 w-5 text-amber-400" />
              Admin Console
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900 p-4 text-white transition-colors hover:border-amber-500/50"
            >
              <User className="h-5 w-5 text-blue-400" />
              Preview Account Paths
            </Link>
          </div>
        </section>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-medium text-white transition-colors hover:bg-slate-700"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900 p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-white">{value}</div>
    </div>
  );
}
