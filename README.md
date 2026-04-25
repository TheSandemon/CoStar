# CoStar - Professional Networking & AI Job Matching Platform

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind">
</p>

## Overview

**CoStar** is a professional networking platform that connects talent with employers through AI-driven profile matching. The platform supports public account paths and hidden privileged operator paths:

1. **Talent Accounts** - Talent can create comprehensive professional profiles connecting social networks, work history, education, accolades, and "work vibe" assessments
2. **Paid Business Accounts** - Employers can access aggregated candidate profiles synthesized with an HR AI agent to find deeply compatible candidates
3. **Agency Accounts** - Agencies can coach, prep, and place talent with AI-powered interview practice and profile tools
4. **Admin/Owner Accounts** - Hidden privileged account types for platform operations and moderation

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Deployment**: Vercel

### Backend & Services
- **Authentication**: Firebase Auth (Google Sign-In)
- **Database**: Firebase Firestore
- **Hosting**: Vercel

### External Integrations
- GitHub OAuth
- LinkedIn OAuth (planned)
- Google OAuth (via Firebase)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account
- Vercel account (for deployment)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/TheSandemon/CoStar.git
cd CoStar
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase**

   a. Go to [Firebase Console](https://console.firebase.google.com)

   b. Create a new project or use existing

   c. Enable Authentication:
      - Go to Authentication → Sign-in method
      - Enable **Google** provider
      - Add your domain to authorized domains

   d. Create a web app:
      - Go to Project Settings → General → Your apps
      - Add web app (</>)
      - Copy the config values

4. **Set up environment variables**

   Create a `.env.local` file:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

5. **Run development server**
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
CoStar/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Landing page
│   │   ├── layout.tsx           # Root layout
│   │   ├── dashboard/            # User dashboard
│   │   │   └── page.tsx
│   │   ├── onboarding/           # Onboarding flow
│   │   │   └── page.tsx
│   │   ├── sign-in/              # Sign-in page
│   │   │   └── [[...sign-in]]
│   │   │       └── page.tsx
│   │   └── sign-up/             # Sign-up page
│   │       └── [[...sign-up]]
│   │           └── page.tsx
│   ├── context/
│   │   └── AuthContext.jsx      # Firebase Auth context
│   └── lib/
│       └── firebase.ts           # Firebase configuration
├── public/                     # Static assets
├── .env.local                  # Local environment variables
├── next.config.js              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── vercel.json                 # Vercel deployment configuration
└── package.json                # Dependencies
```

---

## Firebase Setup Guide

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Follow the steps to create your project

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click "Add provider" → **Google**
3. Enable the Google provider
4. Configure:
   - Project support email: Your email
   - Add your production domain to "Authorized domains"

### 3. Set Up Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Start in test mode (or configure security rules)
3. Database will be automatically used for talent profiles

### 4. Get Configuration

1. Go to **Project Settings** → **General**
2. Scroll to "Your apps" → Click web app (</>)
3. Copy the `firebaseConfig` object

### 5. Environment Variables

Add these to your `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## Vercel Deployment

### Project Workflow

1. Commit changes to a GitHub branch and open a pull request.
2. GitHub/Vercel automatically deploys the PR preview.
3. Test the preview deployment.
4. Merge after review.
5. Wait for the production redeploy, then test the live site.

### Quick Deploy

1. Push your code to GitHub
2. Import project in Vercel:
   - Go to https://vercel.com/new
   - Import from GitHub
3. Configure environment variables in Vercel:
   - Go to Project Settings → Environment Variables
   - Add all Firebase variables from above
4. Deploy!

### Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Environment Variables in Vercel

Add these via Vercel Dashboard:
- Project Settings → Environment Variables

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

---

## Database Schema (Firestore)

### Users Collection

```javascript
// users/{uid}
{
  uid: string,                    // Firebase Auth UID
  email: string,                 // User email
  displayName: string,           // Full name
  photoURL: string,              // Profile photo
  role: "talent" | "business" | "agency" | "admin" | "owner",
  accountType: "talent" | "business" | "agency" | "admin" | "owner",
  accountTypeLocked: boolean,    // Once true, account type is immutable via client writes
  accountTypeLockedAt: timestamp,
  accountTypeSource: "signup" | "legacy" | "migration" | "system",
  emailNormalized: string,
  moderationStatus: "active" | "suspended",
  disabled: boolean,

  // Work Vibe
  workVibe: {
    style: string[],            // ["remote", "hybrid"]
    culture: string[],           // ["startup", "enterprise"]
    values: string,             // Free text
  },

  // Social Connections
  socialConnections: [
    { platform: "github", id: "username", connected: true },
    { platform: "linkedin", id: "profile-url", connected: false }
  ],

  // Work Experience
  workExperience: [
    {
      company: string,
      title: string,
      startDate: Date,
      endDate: Date | null,
      description: string,
      highlights: string[]
    }
  ],

  // Education
  education: [
    {
      institution: string,
      degree: string,
      field: string,
      startDate: Date,
      endDate: Date
    }
  ],

  // Accolades
  accolades: [
    {
      type: "award" | "certification" | "publication",
      title: string,
      issuer: string,
      date: Date,
      description: string
    }
  ],

  // Profile metadata
  publicProfileEnabled: boolean,
  profileComplete: number,       // 0-100
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Account Type Rules

- Public sign-up only offers `talent`, `business`, and `agency`.
- `admin` and `owner` are hidden privileged types and must never be exposed as selectable sign-up paths.
- `kyletouchet@gmail.com` is the hardcoded owner bootstrap email. On authenticated account bootstrap, that email is forced to `accountType: "owner"` and `accountTypeSource: "system"`.
- Account type is static once locked. Changing regular account paths requires deleting the account and recreating it.
- Admin/owner tools live at `/admin`; admins can view platform data and moderate accounts, while owners can also promote/demote admins.

### Admin API Routes

- `POST /api/account/bootstrap` - Firebase-auth-gated server sync for account profiles. Forces `kyletouchet@gmail.com` to owner.
- `GET /api/admin/summary` - Admin/owner only. Returns platform counts and recent users.
- `POST /api/admin/users/set-role` - Owner only. Promotes/demotes admin accounts by email.
- `POST /api/admin/users/set-status` - Admin/owner only. Suspends/reactivates users and toggles public profile visibility.

### Companies Collection (Future)

```javascript
// companies/{companyId}
{
  name: string,
  domain: string,
  logo: string,
  description: string,
  vibeDescription: string,
  cultureTags: string[],
  subscription: {
    tier: "free" | "pro" | "enterprise",
    expiresAt: Date
  },
  createdAt: timestamp
}
```

### Jobs Collection (Future)

```javascript
// jobs/{jobId}
{
  companyId: string,
  title: string,
  description: string,
  vibeRequirements: {
    style: string[],
    culture: string[],
    values: string
  },
  skills: {
    required: string[],
    preferred: string[]
  },
  salary: {
    min: number,
    max: number,
    currency: string
  },
  location: string,
  remotePolicy: "remote" | "hybrid" | "office",
  status: "draft" | "active" | "closed",
  createdAt: timestamp
}
```

---

## Features

### User Features

- **Google Sign-In**: Secure authentication via Firebase Auth
- **Profile Builder**: Multi-step onboarding flow
- **Work Vibe Assessment**: AI-powered culture fit analysis
- **Social Integrations**: Connect GitHub, LinkedIn (coming soon)
- **Job Matching**: AI-suggested positions based on profile
- **Real-time Messaging**: Built-in rich text chat widget for communicating with recruiters and agencies

### Business Features (Coming Soon)

- **Company Profiles**: Branded company pages
- **Talent Search**: AI-powered candidate discovery
- **Pipeline Management**: Track candidates through hiring funnel
- **Team Collaboration**: Multi-user hiring teams
- **Candidate Messaging**: Direct communication channel with talent

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID | Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging Sender ID | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID | Yes |

---

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request and validate the Vercel preview
5. Merge after review, wait for redeploy, and test live

---

## License

MIT License - see LICENSE file for details

---

## Support

- Open an issue for bugs
- Use discussions for questions
- Check Firebase/Vercel docs for platform-specific issues

## Acknowledgments

- [Next.js](https://nextjs.org)
- [Firebase](https://firebase.google.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel](https://vercel.com)
