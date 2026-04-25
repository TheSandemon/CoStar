"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, Chrome } from "lucide-react";

export default function SignInPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

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
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">Sign in to continue to CoStar</p>
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-3"
        >
          <Chrome size={24} />
          Continue with Google
        </button>

        <p className="mt-8 text-center text-slate-500 text-sm">
          Don&apos;t have an account?{" "}
          <button
            onClick={() => router.push("/sign-up")}
            className="text-amber-400 hover:text-amber-300"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
