"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GithubAuthProvider, linkWithPopup, updateProfile } from "firebase/auth";
import { Loader2, Save, Github, Linkedin, CheckCircle2, AlertCircle } from "lucide-react";
import NavHeader from "@/components/NavHeader";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import {
  emptyWorkVibe,
  getSocialConnection,
  getUserProfile,
  saveUserProfile,
  upsertSocialConnection,
  type AccountType,
  type SocialConnection,
  type WorkVibe,
} from "@/lib/profile";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [workVibe, setWorkVibe] = useState<WorkVibe>(emptyWorkVibe);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/sign-in");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const profile = await getUserProfile(user.uid);
        setAccountType(profile?.accountType ?? null);
        setDisplayName(profile?.displayName ?? user.displayName ?? "");
        setHeadline(profile?.headline ?? "");
        setLocation(profile?.location ?? "");
        setSocialConnections(profile?.socialConnections ?? []);
        setWorkVibe(profile?.workVibe ?? emptyWorkVibe);
        setLinkedInUrl(getSocialConnection(profile, "linkedin")?.url ?? "");
      } catch (err) {
        console.error("Failed to load settings:", err);
        setError("Could not load your settings.");
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      loadProfile();
    }
  }, [authLoading, user]);

  const githubConnection = getSocialConnection({ socialConnections }, "github");
  const linkedInConnection = getSocialConnection({ socialConnections }, "linkedin");

  const saveProfile = async (nextConnections = socialConnections) => {
    if (!user) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const trimmedName = displayName.trim();
      if (auth?.currentUser && trimmedName && trimmedName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: trimmedName });
      }

      await saveUserProfile(user.uid, {
        uid: user.uid,
        email: user.email,
        displayName: trimmedName || user.displayName,
        photoURL: user.photoURL,
        accountType,
        role: accountType ?? "user",
        headline: headline.trim(),
        location: location.trim(),
        socialConnections: nextConnections,
        workVibe,
      });
      setSocialConnections(nextConnections);
      setMessage("Settings saved.");
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError("Could not save settings. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const connectGithub = async () => {
    if (!auth?.currentUser || !user) {
      setError("Sign in again before connecting GitHub.");
      return;
    }

    setIsConnectingGithub(true);
    setError(null);
    setMessage(null);

    try {
      const provider = new GithubAuthProvider();
      provider.addScope("read:user");
      provider.addScope("user:email");

      const result = await linkWithPopup(auth.currentUser, provider);
      const githubProvider = result.user.providerData.find((providerData) => providerData.providerId === "github.com");
      const nextConnections = upsertSocialConnection(socialConnections, {
        platform: "github",
        id: githubProvider?.uid ?? result.user.uid,
        label: githubProvider?.displayName ?? "GitHub",
        url: githubProvider?.photoURL ?? undefined,
        connected: true,
        connectedAt: new Date().toISOString(),
      });

      await saveProfile(nextConnections);
      setMessage("GitHub connected.");
    } catch (err: any) {
      console.error("Failed to connect GitHub:", err);
      if (err?.code === "auth/provider-already-linked") {
        const nextConnections = upsertSocialConnection(socialConnections, {
          platform: "github",
          id: auth.currentUser.uid,
          label: "GitHub",
          connected: true,
          connectedAt: new Date().toISOString(),
        });
        await saveProfile(nextConnections);
        setMessage("GitHub was already linked.");
      } else if (err?.code === "auth/credential-already-in-use") {
        setError("That GitHub account is already linked to another CoStar account.");
      } else {
        setError("Could not connect GitHub. Confirm GitHub is enabled in Firebase Auth.");
      }
    } finally {
      setIsConnectingGithub(false);
    }
  };

  const importLinkedIn = async () => {
    const trimmedUrl = linkedInUrl.trim();
    const normalizedUrl = trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`;

    if (!trimmedUrl || !normalizedUrl.includes("linkedin.com/")) {
      setError("Enter a valid LinkedIn profile URL.");
      return;
    }

    const nextConnections = upsertSocialConnection(socialConnections, {
      platform: "linkedin",
      id: normalizedUrl,
      label: "LinkedIn profile",
      url: normalizedUrl,
      connected: true,
      connectedAt: new Date().toISOString(),
    });

    setLinkedInUrl(normalizedUrl);
    await saveProfile(nextConnections);
    setMessage("LinkedIn profile imported.");
  };

  const toggleWorkVibeValue = (field: "style" | "culture", value: string) => {
    setWorkVibe((current) => {
      const selected = current[field];
      return {
        ...current,
        [field]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900">
      <NavHeader />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
          <p className="text-slate-400">Manage your profile details and professional connections.</p>
        </div>

        {(message || error) && (
          <div
            className={`mb-6 border rounded-xl p-4 flex items-center gap-3 ${
              error
                ? "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-green-500/10 border-green-500/30 text-green-300"
            }`}
          >
            {error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span>{error || message}</span>
          </div>
        )}

        <div className="space-y-6">
          <section className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Profile</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white mb-2 font-medium">Full Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-white mb-2 font-medium">Account Type</label>
                <select
                  value={accountType ?? ""}
                  onChange={(e) => setAccountType((e.target.value || null) as AccountType | null)}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Select account type</option>
                  <option value="user">Job Seeker</option>
                  <option value="business">Employer</option>
                  <option value="agency">Agency</option>
                </select>
              </div>
              <div>
                <label className="block text-white mb-2 font-medium">Headline</label>
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Senior Software Engineer"
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-white mb-2 font-medium">Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="San Francisco, CA"
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </section>

          <section id="connections" className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Connections</h2>
            <div className="space-y-4">
              <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-900 p-4 sm:flex-row sm:items-center">
                <Github className="w-6 h-6 text-slate-300" />
                <div className="flex-1">
                  <h3 className="text-white font-semibold">GitHub</h3>
                  <p className="text-sm text-slate-400">
                    {githubConnection?.connected ? "Connected to your Firebase account." : "Link GitHub through Firebase Auth."}
                  </p>
                </div>
                <button
                  onClick={connectGithub}
                  disabled={isConnectingGithub || isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-600 disabled:opacity-60"
                >
                  {isConnectingGithub && <Loader2 className="w-4 h-4 animate-spin" />}
                  {githubConnection?.connected ? "Reconnect" : "Connect"}
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Linkedin className="w-6 h-6 text-blue-400" />
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">LinkedIn</h3>
                    <p className="text-sm text-slate-400">
                      {linkedInConnection?.connected ? "Profile URL imported." : "OAuth integration can be added later."}
                    </p>
                  </div>
                  <button
                    onClick={importLinkedIn}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-400 disabled:opacity-60"
                  >
                    Import
                  </button>
                </div>
                <input
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/your-profile"
                  className="mt-4 w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </section>

          <section className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Work Vibe</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-white mb-3 font-medium">Work Style</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {["Remote", "Hybrid", "In-Office", "Flexible"].map((style) => (
                    <button
                      key={style}
                      onClick={() => toggleWorkVibeValue("style", style)}
                      className={`py-3 border rounded-lg text-white transition-colors ${
                        workVibe.style.includes(style)
                          ? "bg-amber-500/20 border-amber-500"
                          : "bg-slate-900 border-white/10 hover:border-amber-500"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white mb-3 font-medium">Company Culture Preference</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {["Startup", "Enterprise", "Remote-First", "Mission-Driven"].map((culture) => (
                    <button
                      key={culture}
                      onClick={() => toggleWorkVibeValue("culture", culture)}
                      className={`py-3 border rounded-lg text-white transition-colors ${
                        workVibe.culture.includes(culture)
                          ? "bg-amber-500/20 border-amber-500"
                          : "bg-slate-900 border-white/10 hover:border-amber-500"
                      }`}
                    >
                      {culture}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white mb-3 font-medium">What matters most to you?</label>
                <textarea
                  rows={4}
                  value={workVibe.values}
                  onChange={(e) => setWorkVibe((current) => ({ ...current, values: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={() => saveProfile()}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 font-bold text-slate-900 transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
