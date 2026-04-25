"use client";

import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  accountTypeLabels,
  calculateProfileComplete,
  createSlug,
  emptyWorkVibe,
  getSocialConnection,
  getUserProfile,
  lockAccountType,
  saveTypeSpecificProfile,
  upsertSocialConnection,
  type AccountType,
  type SocialConnection,
  type WorkVibe,
} from "@/lib/profile";
import { User, Building2, Users2, ArrowRight, Check, Github, Linkedin, Mail, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [accountTypeLocked, setAccountTypeLocked] = useState(false);
  const [displayName, setDisplayName] = useState("");
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
  const [agencySpecialties, setAgencySpecialties] = useState<string[]>([]);
  const [agencyServices, setAgencyServices] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/sign-in");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const profile = await getUserProfile(user.uid);
        if (!profile) {
          setDisplayName(user.displayName ?? "");
          return;
        }

        setAccountType(profile.accountType ?? null);
        setAccountTypeLocked(Boolean(profile.accountTypeLocked && profile.accountType));
        if (profile.accountType) {
          setStep(2);
        }
        setDisplayName(profile.displayName ?? user.displayName ?? "");
        setHeadline(profile.headline ?? "");
        setLocation(profile.location ?? "");
        setSocialConnections(profile.socialConnections ?? []);
        setWorkVibe(profile.workVibe ?? emptyWorkVibe);
        setLinkedInUrl(getSocialConnection(profile, "linkedin")?.url ?? "");
        setCompanyName(profile.businessProfile?.companyName ?? "");
        setCompanyWebsite(profile.businessProfile?.website ?? "");
        setCompanySize(profile.businessProfile?.companySize ?? "1-10");
        setCompanyDescription(profile.businessProfile?.description ?? "");
        setHiringGoals(profile.businessProfile?.hiringGoals ?? "");
        setAgencyName(profile.agencyProfile?.agencyName ?? "");
        setAgencyWebsite(profile.agencyProfile?.website ?? "");
        setAgencyDescription(profile.agencyProfile?.description ?? "");
        setAgencySpecialties(profile.agencyProfile?.specialties ?? []);
        setAgencyServices(profile.agencyProfile?.services ?? []);
      } catch (err) {
        console.error("Failed to load profile:", err);
        setError("Could not load your profile. You can still continue and save again.");
      }
    };

    loadProfile();
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const steps = [
    { num: 1, title: "Account Type" },
    { num: 2, title: accountType === "business" ? "Company" : accountType === "agency" ? "Agency" : "Basic Info" },
    { num: 3, title: accountType === "business" ? "Hiring" : accountType === "agency" ? "Services" : "Connect Accounts" },
    { num: 4, title: accountType === "business" ? "Culture" : accountType === "agency" ? "Specialties" : "Work Vibe" },
  ];

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

  const toggleStringValue = (
    setter: Dispatch<SetStateAction<string[]>>,
    value: string
  ) => {
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const handleEmailConnect = () => {
    if (!user?.email) return;

    setSocialConnections((current) =>
      upsertSocialConnection(current, {
        platform: "email",
        id: user.email,
        label: user.email,
        connected: true,
        connectedAt: new Date().toISOString(),
      })
    );
  };

  const handleLinkedInImport = () => {
    const trimmedUrl = linkedInUrl.trim();
    if (!trimmedUrl) {
      setError("Enter your LinkedIn profile URL before importing.");
      return;
    }

    const normalizedUrl = trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`;
    if (!normalizedUrl.includes("linkedin.com/")) {
      setError("Use a valid LinkedIn profile URL.");
      return;
    }

    setError(null);
    setLinkedInUrl(normalizedUrl);
    setSocialConnections((current) =>
      upsertSocialConnection(current, {
        platform: "linkedin",
        id: normalizedUrl,
        label: "LinkedIn profile",
        url: normalizedUrl,
        connected: true,
        connectedAt: new Date().toISOString(),
      })
    );
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);

    try {
      if (!accountType) {
        setError("Choose an account type before completing setup.");
        return;
      }

      await lockAccountType(user.uid, accountType, "signup");

      const nextProfile = {
        uid: user.uid,
        email: user.email,
        displayName: displayName.trim() || user.displayName,
        photoURL: user.photoURL,
        slug: createSlug(
          accountType === "business" ? companyName : accountType === "agency" ? agencyName : displayName,
          user.uid
        ),
        accountType,
        role: accountType ?? "talent",
        headline: headline.trim() || defaultHeadline(accountType),
        location: location.trim(),
        socialConnections,
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
        } : null,
        agencyProfile: accountType === "agency" ? {
          agencyName: agencyName.trim(),
          website: agencyWebsite.trim(),
          description: agencyDescription.trim(),
          location: location.trim(),
          specialties: agencySpecialties,
          services: agencyServices,
        } : null,
      };

      await saveTypeSpecificProfile(user.uid, accountType, {
        ...nextProfile,
        profileComplete: calculateProfileComplete(nextProfile),
      });
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to save profile:", err);
      setError("Could not save your profile. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step >= s.num
                    ? "bg-amber-500 text-slate-900"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {step > s.num ? <Check size={20} /> : s.num}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${step > s.num ? "bg-amber-500" : "bg-slate-700"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Account Type */}
        {step === 1 && (
          <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-8">
            <h1 className="text-3xl font-bold text-white mb-2">Choose Your Path</h1>
            <p className="text-slate-400 mb-8">Select how you want to use CoStar</p>

            <div className="space-y-4">
              <button
                onClick={() => setAccountType("talent")}
                className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                  accountType === "talent"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <User className="text-amber-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Talent</h3>
                    <p className="text-slate-400">Build your profile and get matched with your dream job</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setAccountType("business")}
                className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                  accountType === "business"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Building2 className="text-blue-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Employer</h3>
                    <p className="text-slate-400">Find and hire top talent with AI assistance</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setAccountType("agency")}
                className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                  accountType === "agency"
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Users2 className="text-purple-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Agency</h3>
                    <p className="text-slate-400">Prep and place talent with AI-powered coaching and connections</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!accountType}
              className="mt-8 w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {accountType === "business" ? "Set Up Your Company" : accountType === "agency" ? "Set Up Your Agency" : "Tell Us About Yourself"}
            </h1>
            <p className="text-slate-400 mb-8">
              {accountType ? `${accountTypeLabels[accountType]} profile details` : "Let's get the basics down"}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2 font-medium">Representative Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {accountType === "business" && (
                <>
                  <div>
                    <label className="block text-white mb-2 font-medium">Company Name</label>
                    <input
                      type="text"
                      placeholder="Acme Inc."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-2 font-medium">Company Website</label>
                    <input
                      type="url"
                      placeholder="https://acme.com"
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
                </>
              )}

              {accountType === "agency" && (
                <>
                  <div>
                    <label className="block text-white mb-2 font-medium">Agency Name</label>
                    <input
                      type="text"
                      placeholder="Coaching Collective"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-2 font-medium">Agency Website</label>
                    <input
                      type="url"
                      placeholder="https://agency.com"
                      value={agencyWebsite}
                      onChange={(e) => setAgencyWebsite(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-white mb-2 font-medium">Headline</label>
                <input
                  type="text"
                  placeholder={accountType === "business" ? "Hiring team at Acme Inc." : accountType === "agency" ? "Career coaching and placement specialists" : "Senior Software Engineer at TechCorp"}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Location</label>
                <input
                  type="text"
                  placeholder="San Francisco, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setStep(accountTypeLocked ? 2 : 1)}
                disabled={accountTypeLocked}
                className="flex-1 py-4 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-colors"
              >
                {accountTypeLocked ? "Type Locked" : "Back"}
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Connect Accounts */}
        {step === 3 && (
          <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {accountType === "business" ? "Hiring Goals" : accountType === "agency" ? "Services" : "Connect Your Accounts"}
            </h1>
            <p className="text-slate-400 mb-8">
              {accountType === "business"
                ? "Tell candidates what you are building toward"
                : accountType === "agency"
                ? "Choose the services your agency offers"
                : "Import your professional presence"}
            </p>

            {accountType === "business" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-white mb-2 font-medium">Company Description</label>
                  <textarea
                    rows={4}
                    placeholder="Tell candidates what your company does and why people join."
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2 font-medium">Hiring Goals</label>
                  <textarea
                    rows={4}
                    placeholder="What roles, teams, or candidate qualities are you hiring for?"
                    value={hiringGoals}
                    onChange={(e) => setHiringGoals(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            ) : accountType === "agency" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-white mb-3 font-medium">Services</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["Interview Coaching", "Resume Review", "Placement", "Career Strategy"].map((service) => (
                      <button
                        key={service}
                        onClick={() => toggleStringValue(setAgencyServices, service)}
                        className={`py-3 border rounded-lg text-white transition-colors ${
                          agencyServices.includes(service)
                            ? "bg-purple-500/20 border-purple-500"
                            : "bg-slate-900 border-white/10 hover:border-purple-500"
                        }`}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-white mb-2 font-medium">Agency Description</label>
                  <textarea
                    rows={4}
                    placeholder="Describe how your agency supports candidates or clients."
                    value={agencyDescription}
                    onChange={(e) => setAgencyDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
              {[
                {
                  icon: Github,
                  name: "GitHub",
                  desc: "Showcase your code and contributions",
                  bgClass: "bg-amber-500/20",
                  iconClass: "text-amber-400",
                },
                {
                  icon: Linkedin,
                  name: "LinkedIn",
                  desc: "Import your professional network",
                  bgClass: "bg-blue-500/20",
                  iconClass: "text-blue-400",
                },
                {
                  icon: Mail,
                  name: "Email",
                  desc: "Verify your email address",
                  bgClass: "bg-green-500/20",
                  iconClass: "text-green-400",
                },
              ].map((account) => {
                const platform = account.name.toLowerCase() as "github" | "linkedin" | "email";
                const connected = Boolean(getSocialConnection({ socialConnections }, platform)?.connected);

                return (
                <button
                  key={account.name}
                  onClick={() => {
                    if (platform === "email") handleEmailConnect();
                    if (platform === "linkedin") handleLinkedInImport();
                  }}
                  className="w-full p-4 bg-slate-900 border border-white/10 rounded-xl hover:border-white/30 transition-colors flex items-center gap-4"
                >
                  <div className={`w-10 h-10 ${account.bgClass} rounded-lg flex items-center justify-center`}>
                    <account.icon className={account.iconClass} size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-white font-semibold">{account.name}</h3>
                    <p className="text-slate-400 text-sm">{account.desc}</p>
                  </div>
                  <span className={connected ? "text-green-400" : "text-slate-500"}>
                    {connected ? "Connected" : platform === "github" ? "Finish in Settings" : "Connect"}
                  </span>
                </button>
              )})}
              <div>
                <label className="block text-white mb-2 font-medium">LinkedIn Profile URL</label>
                <input
                  type="url"
                  placeholder="https://www.linkedin.com/in/your-profile"
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            )}

            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Work Vibe */}
        {step === 4 && (
          <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {accountType === "business" ? "Company Culture" : accountType === "agency" ? "Agency Specialties" : "Discover Your Work Vibe"}
            </h1>
            <p className="text-slate-400 mb-8">
              {accountType === "business"
                ? "Help candidates understand your workplace"
                : accountType === "agency"
                ? "Define where your agency is strongest"
                : "Help us understand what makes you tick"}
            </p>

            {accountType === "agency" ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-white mb-3 font-medium">Specialties</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["Software Engineering", "Sales", "Operations", "Executive Search"].map((specialty) => (
                      <button
                        key={specialty}
                        onClick={() => toggleStringValue(setAgencySpecialties, specialty)}
                        className={`py-3 border rounded-lg text-white transition-colors ${
                          agencySpecialties.includes(specialty)
                            ? "bg-purple-500/20 border-purple-500"
                            : "bg-slate-900 border-white/10 hover:border-purple-500"
                        }`}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
              <div>
                <label className="block text-white mb-3 font-medium">
                  {accountType === "business" ? "Work Environment" : "Work Style"}
                </label>
                <div className="grid grid-cols-2 gap-3">
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
                <label className="block text-white mb-3 font-medium">
                  {accountType === "business" ? "Company Culture" : "Company Culture Preference"}
                </label>
                <div className="grid grid-cols-2 gap-3">
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
                <label className="block text-white mb-3 font-medium">
                  {accountType === "business" ? "What should candidates know about your culture?" : "What matters most to you?"}
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us about your values, goals, and what you're looking for..."
                  value={workVibe.values}
                  onChange={(e) => setWorkVibe((current) => ({ ...current, values: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>
            </div>
            )}

            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-4 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex-1 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check size={20} />}
                Complete Setup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function defaultHeadline(accountType: AccountType): string {
  if (accountType === "business") return "Employer on CoStar";
  if (accountType === "agency") return "Talent agency on CoStar";
  return "Talent on CoStar";
}
