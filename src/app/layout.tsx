import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CoStar - Professional Networking & AI Job Matching",
  description: "Connect your professional journey. AI-powered job matching that understands your work vibe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
          <div className="fixed bottom-1 right-2 text-[10px] text-gray-500/50 pointer-events-none z-50 font-mono">
            v{process.env.NEXT_PUBLIC_BUILD_TIME ? new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'dev'}
          </div>
        </body>
      </html>
    </AuthProvider>
  );
}
