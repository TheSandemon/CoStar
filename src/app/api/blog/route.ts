export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { createBlogSlug } from '@/lib/blog';
import { jsonError, requireAdmin } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { db, decoded, profile } = await requireAdmin(req);
    const body = await req.json();
    const title = String(body.title ?? '').trim();
    const excerpt = String(body.excerpt ?? '').trim();
    const contentJson = String(body.contentJson ?? '').trim();
    const status = body.status === 'published' ? 'published' : 'draft';

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }
    if (!contentJson) {
      return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
    }

    const slug = await createUniqueSlug(db, createBlogSlug(title));
    const docRef = db.collection('blogPosts').doc();
    const now = FieldValue.serverTimestamp();

    await docRef.set({
      title,
      slug,
      excerpt,
      contentJson,
      status,
      authorUid: decoded.uid,
      authorName: profile?.displayName || profile?.email || 'CoStar Admin',
      createdAt: now,
      updatedAt: now,
      publishedAt: status === 'published' ? now : null,
    });

    return NextResponse.json({ id: docRef.id, slug });
  } catch (err) {
    return jsonError(err);
  }
}

async function createUniqueSlug(db: Firestore, baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (counter < 100) {
    const snap = await db.collection('blogPosts').where('slug', '==', slug).limit(1).get();
    if (snap.empty) return slug;
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return `${baseSlug}-${Date.now()}`;
}
