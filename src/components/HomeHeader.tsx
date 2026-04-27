'use client';

import Link from 'next/link';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '/blog', label: 'Blog' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/sign-in', label: 'Sign In' },
];

export default function HomeHeader() {
  return (
    <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
            <span className="text-slate-900 font-bold text-xl">C</span>
          </div>
          <span className="text-white text-xl font-bold">CoStar</span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-8 flex-wrap">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-slate-300 hover:text-white transition-colors text-sm sm:text-base">
              {link.label}
            </Link>
          ))}
          <Link href="/sign-up" className="px-4 py-2 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm sm:text-base">
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}