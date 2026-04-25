"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GithubAuthProvider, deleteUser, linkWithPopup, updateProfile } from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import { Loader2, Save, Github, Linkedin, CheckCircle2, AlertCircle, Trash2, Upload, Camera } from "lucide-react";
import NavHeader from "@/components/NavHeader";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { uploadProfileImage } from "@/lib/storage";
import {
  accountTypeLabels,
  createSlug,
  emptyWorkVibe,
  getOperatorPreviewProfile,
  getSocialConnection,
  getUserProfile,
  isPrivilegedAccountType,
  publicAccountTypes,
  saveOperatorPreviewProfile,
  saveTypeSpecificProfile,
  upsertSocialConnection,
  type AccountType,
  type PublicAccountType,
  type SocialConnection,
  type WorkVibe,
} from "@/lib/profile";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isOperator = isPrivilegedAccountType(user?.accountType);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [previewType, setPreviewType] = useState<PublicAccountType>("talent");
  const [displayName, setDisplayName] = useState("");
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [workVibe, setWorkVibe] = useState<WorkVibe>(emptyWorkVibe);
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companySize, setCompanySize] = useState("1-10");
  const [companyDescription, setCompanyDescription] = useState("");
  const [hiringGoals, setHiringGoals] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agencyWebsite, setAgencyWebsite] = useState("");
  const [agencyDescription, setAgencyDescription] = useState("");
  const [agencySpecialties, setAgencySpecialties] = useState("");
  const [agencyServices, setAgencyServices] = useState("");

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
        const profile = isOperator
          ? await getOperatorPreviewProfile(user.uid, previewType, user)
          : await getUserProfile(user.uid);
        setAccountType(profile?.accountType ?? null);
        if (!isOperator && profile && !profile.accountType) {
          router.push("/onboarding");
          return;
        }
        setPublicProfileEnabled(profile?.publicProfileEnabled ?? true);
        setDisplayName(profile?.displayName ?? user.displayName ?? "");
        setHeadline(profile?.headline ?? "");
        setLocation(profile?.location ?? "");
        setSocialConnections(profile?.socialConnections ?? []);
        setWorkVibe(profile?.workVibe ?? emptyWorkVibe);
        setLinkedInUrl(getSocialConnection(profile, "linkedin")?.url ?? "");
        setCompanyName(profile?.businessProfile?.companyName ?? "");
        setCompanyWebsite(profile?.businessProfile?.website ?? "");
        setCompanySize(profile?.businessProfile?.companySize ?? "1-10");
        setCompanyDescription(profile?.businessProfile?.description ?? "");
        setHiringGoals(profile?.businessProfile?.hiringGoals ?? "");
        setAgencyName(profile?.agencyProfile?.agencyName ?? "");
        setAgencyWebsite(profile?.agencyProfile?.website ?? "");
        setAgencyDescription(profile?.agencyProfile?.description ?? "");
        setAgencySpecialties((profile?.agencyProfile?.specialties ?? []).join(", "));
        setAgencyServices((profile?.agencyProfile?.services ?? []).join(", "));
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
  }, [authLoading, user, isOperator, previewType, router]);

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

      if (!accountType) {
        setError("Choose your account type in onboarding before saving settings.");
        return;
      }

      const profileUpdates = {
        uid: user.uid,
        email: user.email,
        displayName: trimmedName || user.displayName,
        photoURL: user.photoURL,
        publicProfileEnabled,
        slug: createSlug(
          accountType === "business" ? companyName : accountType === "agency" ? agencyName : trimmedName,
          user.uid
        ),
        headline: headline.trim(),
        location: location.trim(),
        socialConnections: nextConnections,
        workVibe: accountType === "talent" ? workVibe : emptyWorkVibe,
        businessProfile: accountType === "business" ? {
          companyName: companyName.trim(),
          website: companyWebsite.trim(),
          companySize,
          description: companyDescription.trim(),
          headquarters: { city: location.trim() },
          hiringGoals: hiringGoals.trim(),
          culture: {
            values: workVibe.values.trim(),
            tags: [...workVibe.style, ...workVibe.culture],
          },
        } : undefined,
        agencyProfile: accountType === "agency" ? {
          agencyName: agencyName.trim(),
          website: agencyWebsite.trim(),
          description: agencyDescription.trim(),
          location: location.trim(),
          specialties: splitCsv(agencySpecialties),
          services: splitCsv(agencyServices),
        } : undefined,
      };

      if (isOperator) {
        await saveOperatorPreviewProfile(user.uid, accountType as PublicAccountType, profileUpdates);
      } else {
        await saveTypeSpecificProfile(user.uid, accountType, profileUpdates);
      }
      setSocialConnections(nextConnections);
      setMessage(isOperator ? "Preview settings saved." : "Settings saved.");
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !auth?.currentUser) return;
    
    setIsUploadingImage(true);
    setError(null);
    try {
      const url = await uploadProfileImage(user.uid, file);
      await updateProfile(auth.currentUser, { photoURL: url });
      setMessage("Profile image updated. Save settings to apply changes everywhere.");
    } catch (err) {
      console.error(err);
      setError("Failed to upload image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const deleteAccount = async () => {
    if (!auth?.currentUser || !user || !db) {
      setError("Sign in again before deleting your account.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this CoStar account? This removes your profile and lets this email choose a new account type only after signing up again."
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);
    setMessage(null);

    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(auth.currentUser);
      router.push("/");
    } catch (err: any) {
      console.error("Failed to delete account:", err);
      if (err?.code === "auth/requires-recent-login") {
        setError("Firebase requires a fresh sign-in before deleting this account. Sign out, sign back in, then try again.");
      } else {
        setError("Could not delete this account. Try again in a moment.");
      }
    } finally {
      setIsDeleting(false);
    }
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
          <p className="text-slate-400">
            {isOperator
              ? "Edit private sandbox versions of each public account path."
              : "Manage your profile details and professional connections."}
          </p>
        </div>

        {isOperator && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="mb-3 font-semibold text-amber-200">Preview account path</div>
            <div className="flex flex-wrap gap-2">
              {publicAccountTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setPreviewType(type)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    previewType === type
                      ? "bg-amber-500 text-slate-900"
                      : "bg-slate-900 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {accountTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>
        )}

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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Profile</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-medium text-slate-300">Public Profile</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={publicProfileEnabled}
                    onChange={(e) => setPublicProfileEnabled(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${publicProfileEnabled ? 'bg-amber-500' : 'bg-slate-700'}`}></div>
                  <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${publicProfileEnabled ? 'translate-x-4' : ''}`}></div>
                </div>
              </label>
            </div>
            
            <div className="mb-6 flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-slate-900 relative">
                {auth?.currentUser?.photoURL ? (
                  <img src={auth.currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-slate-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
              </div>
              <div>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-800">
                  {isUploadingImage && <Loader2 className="w-4 h-4 animate-spin" />}
                  Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                </label>
              </div>
            </div>

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
                <div className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white">
                  {accountType ? accountTypeLabels[accountType] : "Select in onboarding"}
                  <span className="ml-2 text-xs text-slate-500">Locked</span>
                </div>
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

          {accountType === "business" && (
            <section className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Company Profile</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white mb-2 font-medium">Company Name</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2 font-medium">Website</label>
                  <input
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2 font-medium">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:border-amber-500 focus:outline-none"
                  >
                    {["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"].map((size) => (
                      <option key={size} value={size}>{size} employees</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white mb-2 font-medium">Hiring Goals</label>
                  <input
                    value={hiringGoals}
                    onChange={(e) => setHiringGoals(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-white mb-2 font-medium">Company Description</label>
                <textarea
                  rows={4}
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>
            </section>
          )}

          {accountType === "agency" && (
            <section className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Agency Profile</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white mb-2 font-medium">Agency Name</label>
                  <input
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2 font-medium">Website</label>
                  <input
                    value={agencyWebsite}
                    onChange={(e) => setAgencyWebsite(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2 font-medium">Services</label>
                  <input
                    value={agencyServices}
                    onChange={(e) => setAgencyServices(e.target.value)}
                    placeholder="Interview Coaching, Placement"
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2 font-medium">Specialties</label>
                  <input
                    value={agencySpecialties}
                    onChange={(e) => setAgencySpecialties(e.target.value)}
                    placeholder="Engineering, Sales"
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-white mb-2 font-medium">Agency Description</label>
                <textarea
                  rows={4}
                  value={agencyDescription}
                  onChange={(e) => setAgencyDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>
            </section>
          )}

          {accountType === "talent" && (
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
          )}

          {accountType !== "agency" && (
          <section className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">{accountType === "business" ? "Company Culture" : "Work Vibe"}</h2>
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
          )}

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

          {!isOperator && (
          <section className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">Delete Account</h2>
            <p className="text-slate-400 mb-4">
              Account type is permanent for this email. Deleting this account removes the profile so the email can be used to create a new CoStar account path later.
            </p>
            <button
              onClick={deleteAccount}
              disabled={isDeleting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 font-bold text-white transition-colors hover:bg-red-400 disabled:opacity-60"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Delete Account
            </button>
          </section>
          )}
        </div>
      </main>
    </div>
  );
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
