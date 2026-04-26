import type { Metadata } from 'next';
import { BlogPageClient } from '@/components/blog/BlogPageClient';

export const metadata: Metadata = {
  title: 'Blog - CoStar',
  description: 'Interview practice, hiring signals, and CoStar platform updates.',
};

export default function BlogPage() {
  return <BlogPageClient />;
}
