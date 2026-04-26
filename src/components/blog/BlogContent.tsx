'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { safeParseBlogContent } from '@/lib/blog';

interface BlogContentProps {
  contentJson: string;
}

export function BlogContent({ contentJson }: BlogContentProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: safeParseBlogContent(contentJson),
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-slate max-w-none text-slate-200 prose-headings:text-white prose-a:text-amber-300 prose-strong:text-white focus:outline-none',
      },
    },
  });

  if (!editor) {
    return <div className="h-32 animate-pulse rounded-lg bg-slate-800/60" />;
  }

  return <EditorContent editor={editor} />;
}
