'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isPrivilegedAccountType } from '@/lib/profile';
import { LogOut, User, Mic, Shield, Menu, X } from 'lucide-react';
import SiteSearch from './SiteSearch';

export default function NavHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const accountType = user?.accountType ?? null;
  const profileHref = user
    ? isPrivilegedAccountType(accountType)
      ? '/account'
      : accountType
      ? '/dashboard/settings'
      : '/onboarding'
    : '/sign-in';

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await logout();
    router.push('/');
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  if (loading) {
    return (
      <header className="border-b border-white/10 bg-slate-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="h-8 bg-slate-700/50 animate-pulse rounded"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-white/10 bg-slate-800/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-bold">C</span>
            </div>
            <span className="text-white font-bold">CoStar</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/jobs" className="text-slate-300 hover:text-white transition-colors">Jobs</Link>
          <Link href="/blog" className="text-slate-300 hover:text-white transition-colors">Blog</Link>
          <Link href="/audition" className="flex items-center gap-1.5 text-violet-300 hover:text-violet-200 transition-colors font-medium">
            <Mic className="w-3.5 h-3.5" />
            Audition
          </Link>
          {accountType === 'business' && (
            <Link href="/dashboard/jobs" className="text-slate-300 hover:text-white transition-colors">
              Post a Job
            </Link>
          )}
          {accountType === 'agency' && (
            <Link href="/dashboard/settings" className="text-slate-300 hover:text-white transition-colors">
              Agency Profile
            </Link>
          )}
          {accountType === 'business' && (
            <Link href="/dashboard/settings" className="text-slate-300 hover:text-white transition-colors">Company Profile</Link>
          )}
          {(accountType === 'admin' || accountType === 'owner') && (
            <Link href="/admin" className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition-colors font-medium">
              <Shield className="w-3.5 h-3.5" />
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <SiteSearch />
          </div>
          {user ? (
            <>
              <Link
                href={profileHref}
                className="hidden sm:flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                <User size={18} />
                <span className="hidden sm:inline">{user.displayName || user.email}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="hidden sm:block p-2 text-slate-400 hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="hidden sm:inline-flex px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-medium"
            >
              Sign In
            </Link>
          )}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div id="mobile-navigation" className="md:hidden border-t border-white/10 bg-slate-900/95">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
            <SiteSearch />
            <nav className="flex flex-col gap-1">
              <Link href="/jobs" onClick={closeMobileMenu} className="px-3 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                Jobs
              </Link>
              <Link href="/blog" onClick={closeMobileMenu} className="px-3 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                Blog
              </Link>
              <Link href="/audition" onClick={closeMobileMenu} className="px-3 py-3 rounded-lg flex items-center gap-2 text-violet-300 hover:text-violet-200 hover:bg-white/5 transition-colors font-medium">
                <Mic className="w-4 h-4" />
                Audition
              </Link>
              {accountType === 'business' && (
                <Link href="/dashboard/jobs" onClick={closeMobileMenu} className="px-3 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                  Post a Job
                </Link>
              )}
              {accountType === 'agency' && (
                <Link href="/dashboard/settings" onClick={closeMobileMenu} className="px-3 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                  Agency Profile
                </Link>
              )}
              {accountType === 'business' && (
                <Link href="/dashboard/settings" onClick={closeMobileMenu} className="px-3 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                  Company Profile
                </Link>
              )}
              {(accountType === 'admin' || accountType === 'owner') && (
                <Link href="/admin" onClick={closeMobileMenu} className="px-3 py-3 rounded-lg flex items-center gap-2 text-amber-300 hover:text-amber-200 hover:bg-white/5 transition-colors font-medium">
                  <Shield className="w-4 h-4" />
                  Admin
                </Link>
              )}
            </nav>
            <div className="border-t border-white/10 pt-4">
              {user ? (
                <div className="flex flex-col gap-1">
                  <Link
                    href={profileHref}
                    onClick={closeMobileMenu}
                    className="px-3 py-3 rounded-lg flex items-center gap-2 text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <User size={18} />
                    <span className="truncate">{user.displayName || user.email}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-3 rounded-lg flex items-center gap-2 text-left text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <LogOut size={18} />
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  href="/sign-in"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-medium"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
