'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowLeft, Loader2 } from 'lucide-react';
import NavHeader from '@/components/NavHeader';
import { BlogContent } from '@/components/blog/BlogContent';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { BlogPost } from '@/lib/blog';
import { serializeBlogTimestamp } from '@/lib/blog';

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const { user, loading } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isPrivileged = user?.accountType === 'admin' || user?.accountType === 'owner';

  useEffect(() => {
    if (loading) return;

    async function fetchPost() {
      setIsLoading(true);
      setError(null);
      try {
        if (!db) throw new Error('Firestore is not initialized.');
        const postQuery = isPrivileged
          ? query(collection(db, 'blogPosts'), where('slug', '==', params.slug))
          : query(collection(db, 'blogPosts'), where('slug', '==', params.slug), where('status', '==', 'published'));
        const snapshot = await getDocs(postQuery);
        const match = snapshot.docs
          .map((docSnap) => normalizeBlogPost(docSnap.id, docSnap.data()))
          .find((candidate) => isPrivileged || candidate.status === 'published');
        setPost(match ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load this blog post.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPost();
  }, [isPrivileged, loading, params.slug]);

  return (
    <div className="min-h-screen bg-slate-900">
      <NavHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/blog" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">{error}</div>
        ) : !post ? (
          <div className="rounded-xl border border-white/10 bg-slate-800/50 p-10 text-center text-slate-400">
            Blog post not found.
          </div>
        ) : (
          <article>
            <div className="mb-8 border-b border-white/10 pb-8">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {isPrivileged && (
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${post.status === 'published' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                    {post.status}
                  </span>
                )}
                <span className="text-sm text-slate-500">{formatDate(post.publishedAt ?? post.updatedAt)}</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white">{post.title}</h1>
              {post.excerpt && <p className="mt-4 text-lg text-slate-400">{post.excerpt}</p>}
            </div>
            <BlogContent contentJson={post.contentJson} />
          </article>
        )}
      </main>
    </div>
  );
}

function normalizeBlogPost(id: string, data: any): BlogPost {
  return {
    id,
    title: data.title ?? '',
    slug: data.slug ?? id,
    excerpt: data.excerpt ?? '',
    contentJson: data.contentJson ?? '',
    status: data.status === 'published' ? 'published' : 'draft',
    authorUid: data.authorUid ?? '',
    authorName: data.authorName ?? '',
    createdAt: serializeBlogTimestamp(data.createdAt),
    updatedAt: serializeBlogTimestamp(data.updatedAt),
    publishedAt: serializeBlogTimestamp(data.publishedAt),
  };
}

function formatDate(value: string | null): string {
  if (!value) return 'Not published';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
