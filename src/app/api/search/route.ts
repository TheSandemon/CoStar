import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SearchResult, SearchResultType } from '@/lib/search';

export const runtime = 'nodejs';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin credentials in environment variables.");
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryParam = searchParams.get('q')?.toLowerCase() || '';
    const typeParam = (searchParams.get('type') as SearchResultType) || 'all';

    if (!queryParam || queryParam.length < 2) {
      return NextResponse.json([]);
    }

    const app = getAdminApp();
    const db = getFirestore(app);
    const results: SearchResult[] = [];

    // Search Users & Agencies
    if (typeParam === 'all' || typeParam === 'user' || typeParam === 'agency') {
      const usersSnap = await db.collection('users').get();
      usersSnap.forEach(doc => {
        const data = doc.data();
        const matchesName = (data.displayName || '').toLowerCase().includes(queryParam);
        const matchesHeadline = (data.headline || '').toLowerCase().includes(queryParam);
        const matchesBio = (data.bio || '').toLowerCase().includes(queryParam);
        
        if (matchesName || matchesHeadline || matchesBio) {
          const isAgency = data.accountType === 'agency';
          if (typeParam === 'all' || (typeParam === 'user' && !isAgency) || (typeParam === 'agency' && isAgency)) {
            results.push({
              id: doc.id,
              type: isAgency ? 'agency' : 'user',
              title: data.displayName || 'Unnamed User',
              subtitle: data.headline || data.location || (isAgency ? 'Agency' : 'Talent'),
              image: data.photoURL || null,
              url: isAgency && data.slug ? `/agencies/${data.slug}` : (data.slug ? `/u/${data.slug}` : `/u/${doc.id}`)
            });
          }
        }
      });
    }

    // Search Businesses
    if (typeParam === 'all' || typeParam === 'business') {
      const companiesSnap = await db.collection('companies').get();
      companiesSnap.forEach(doc => {
        const data = doc.data();
        const matchesName = (data.name || '').toLowerCase().includes(queryParam);
        const matchesDesc = (data.description || '').toLowerCase().includes(queryParam);
        const matchesIndustry = (data.industry || '').toLowerCase().includes(queryParam);

        if (matchesName || matchesDesc || matchesIndustry) {
          results.push({
            id: doc.id,
            type: 'business',
            title: data.name,
            subtitle: data.industry ? `${data.industry} • ${data.location || ''}` : data.location || 'Business',
            image: data.logoUrl || null,
            url: data.slug ? `/companies/${data.slug}` : `/companies/${doc.id}`
          });
        }
      });
    }

    // Search Jobs
    if (typeParam === 'all' || typeParam === 'job') {
      const jobsSnap = await db.collection('jobs').get();
      jobsSnap.forEach(doc => {
        const data = doc.data();
        const matchesTitle = (data.title || '').toLowerCase().includes(queryParam);
        const matchesCompany = (data.companyName || '').toLowerCase().includes(queryParam);
        const matchesDesc = (data.description || '').toLowerCase().includes(queryParam);

        if (matchesTitle || matchesCompany || matchesDesc) {
          results.push({
            id: doc.id,
            type: 'job',
            title: data.title || 'Untitled Job',
            subtitle: `${data.companyName || 'Unknown Company'} • ${data.location?.city || data.location || ''}`,
            image: data.companyLogo || null,
            url: data.slug ? `/jobs/${data.slug}` : `/jobs/${doc.id}`
          });
        }
      });
    }

    // Limit to 20 results overall
    const limitedResults = results.slice(0, 20);

    return NextResponse.json(limitedResults);

  } catch (err) {
    console.error('[search/api]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
