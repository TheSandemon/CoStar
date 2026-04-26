import Link from "next/link";
import { User, Building2, Users2, ArrowRight, Github, Linkedin, CheckCircle2 } from "lucide-react";
import HomeHeader from "@/components/HomeHeader";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <HomeHeader />

      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Your Professional Journey,{" "}
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                Unified
              </span>
            </h1>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              Connect GitHub, LinkedIn, and more. Let AI understand your work vibe and find your perfect career match.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up" className="px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                Create Free Profile <ArrowRight size={20} />
              </Link>
              <Link href="/sign-up?type=business" className="px-8 py-4 bg-white/10 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-colors border border-white/20">
                Start Hiring
              </Link>
              <Link href="/sign-up?type=agency" className="px-8 py-4 bg-purple-500/20 text-purple-300 rounded-xl font-bold text-lg hover:bg-purple-500/30 transition-colors border border-purple-500/30">
                Start an Agency
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Account Types */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Choose Your Path
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
            Whether you&apos;re building your career, building a team, or coaching the next generation of talent, CoStar has you covered.
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* User Account */}
            <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-8 hover:border-amber-500/50 transition-colors group">
              <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-amber-500/30 transition-colors">
                <User className="text-amber-400" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Talent</h3>
              <p className="text-slate-400 mb-6">
                Build your comprehensive professional profile. Connect social accounts, showcase your work vibe, and get matched with companies that fit you.
              </p>
              <ul className="space-y-3">
                {[
                  "Connect GitHub, LinkedIn, Twitter",
                  "Work & Education History",
                  "AI Work Vibe Assessment",
                  "Job Matches & Insights",
                  "Verified Profile Badges",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="text-amber-400" size={18} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up?type=talent" className="mt-8 block w-full py-3 bg-amber-500 text-slate-900 rounded-lg font-semibold text-center hover:bg-amber-400 transition-colors">
                Create Free Profile
              </Link>
            </div>

            {/* Business Account */}
            <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-8 hover:border-blue-500/50 transition-colors group">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/30 transition-colors">
                <Building2 className="text-blue-400" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Employer</h3>
              <p className="text-slate-400 mb-6">
                Access aggregated candidate profiles synthesized with AI. Describe your culture and vibe, let our HR agent find deeply compatible candidates.
              </p>
              <ul className="space-y-3">
                {[
                  "AI Candidate Synthesis",
                  "Culture Fit Matching",
                  "Talent Pipeline",
                  "Team Collaboration",
                  "Priority Support",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="text-blue-400" size={18} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up?type=business" className="mt-8 block w-full py-3 bg-blue-500 text-white rounded-lg font-semibold text-center hover:bg-blue-400 transition-colors">
                Start Free Trial
              </Link>
            </div>

            {/* Agency Account */}
            <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-8 hover:border-purple-500/50 transition-colors group">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-500/30 transition-colors">
                <Users2 className="text-purple-400" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Agency</h3>
              <p className="text-slate-400 mb-6">
                Coach, prep, and place talent with AI-powered interview practice. Build connections and track candidate progress.
              </p>
              <ul className="space-y-3">
                {[
                  "AI Interview Coaching",
                  "Talent Placement",
                  "Audition Sessions",
                  "Connect & Network",
                  "Performance Insights",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="text-purple-400" size={18} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up?type=agency" className="mt-8 block w-full py-3 bg-purple-500 text-white rounded-lg font-semibold text-center hover:bg-purple-400 transition-colors">
                Start Your Agency
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
            Powerful features to showcase your professional journey and find your perfect match.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Github,
                title: "Social Integrations",
                description: "Connect GitHub, LinkedIn, Twitter and more. Import your work, contributions, and professional network.",
                color: "amber",
              },
              {
                icon: Linkedin,
                title: "Work Vibe AI",
                description: "Our AI analyzes your work style, values, and preferences to find your ideal company culture.",
                color: "blue",
              },
              {
                icon: Building2,
                title: "Smart Matching",
                description: "Get matched with positions that align with your skills, experience, and personality.",
                color: "green",
              },
            ].map((feature) => (
              <div key={feature.title} className="bg-slate-800/80 border border-white/10 rounded-xl p-6">
                <div className={`w-12 h-12 bg-${feature.color}-500/20 rounded-lg flex items-center justify-center mb-4`}>
                  <feature.icon className={`text-${feature.color}-400`} size={24} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Career Journey?
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Join thousands of professionals building their future with CoStar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up" className="px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity">
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-bold">C</span>
            </div>
            <span className="text-white font-bold">CoStar</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2024 CoStar. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
