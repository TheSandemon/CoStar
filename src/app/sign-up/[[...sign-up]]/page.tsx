"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, Building2, Chrome, User, Users2 } from "lucide-react";
import { accountTypeLabels, normalizeAccountType, type AccountType } from "@/lib/profile";

const accountTypeOptions: Array<{
  type: AccountType;
  title: string;
  description: string;
  Icon: typeof User;
  accent: string;
}> = [
  {
    type: "talent",
    title: "Talent",
    description: "Build a public talent profile, practice auditions, and find aligned jobs.",
    Icon: User,
    accent: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  },
  {
    type: "business",
    title: "Employer",
    description: "Create a company profile, post jobs, and manage hiring workflows.",
    Icon: Building2,
    accent: "text-blue-400 border-blue-500/40 bg-blue-500/10",
  },
  {
    type: "agency",
    title: "Agency",
    description: "Represent talent, coach candidates, and publish your agency profile.",
    Icon: Users2,
    accent: "text-purple-400 border-purple-500/40 bg-purple-500/10",
  },
];

export default function SignUpPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTypeParam = searchParams.get("type");
  const normalizedRequestedType = normalizeAccountType(requestedTypeParam);
  const requestedType = normalizedRequestedType && normalizedRequestedType !== "admin" && normalizedRequestedType !== "owner"
    ? normalizedRequestedType
    : null;

  useEffect(() => {
    if (!loading && user) {
      router.push(user.accountType === "admin" || user.accountType === "owner" ? "/admin" : user.accountType ? "/dashboard" : "/onboarding");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md p-8 bg-slate-800/50 border border-white/10 rounded-2xl">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-slate-900 font-bold text-2xl">C</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {requestedType ? `Join as ${accountTypeLabels[requestedType]}` : "Choose Your Account Path"}
          </h1>
          <p className="text-slate-400">
            {requestedType
              ? "This account type is permanent for this email once the account is created."
              : "Select the experience that matches how you will use CoStar."}
          </p>
        </div>

        {requestedType ? (
          <button
            onClick={() => signInWithGoogle(requestedType)}
            className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-3"
          >
            <Chrome size={24} />
            Continue with Google
          </button>
        ) : (
          <div className="space-y-3">
            {accountTypeOptions.map(({ type, title, description, Icon, accent }) => (
              <button
                key={type}
                onClick={() => router.push(`/sign-up?type=${type}`)}
                className={`w-full rounded-xl border p-4 text-left transition-colors hover:border-white/30 ${accent}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 shrink-0" />
                  <div>
                    <div className="font-bold text-white">{title}</div>
                    <div className="text-sm text-slate-300">{description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-slate-500 text-sm">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/sign-in")}
            className="text-amber-400 hover:text-amber-300"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
