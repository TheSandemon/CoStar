'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Briefcase, Building2, User, Settings } from 'lucide-react';

export default function NavHeader() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

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
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
          <Link href="#" className="text-slate-300 hover:text-white transition-colors">Companies</Link>
          <Link href="#" className="text-slate-300 hover:text-white transition-colors">Messages</Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                <User size={18} />
                <span className="hidden sm:inline">{user.displayName || user.email}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-medium"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
