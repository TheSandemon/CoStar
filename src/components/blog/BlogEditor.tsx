'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Save, Send, X } from 'lucide-react';
import type { BlogPost } from '@/lib/blog';
import { EMPTY_BLOG_CONTENT, safeParseBlogContent } from '@/lib/blog';

interface BlogEditorProps {
  post?: BlogPost | null;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (payload: { title: string; excerpt: string; contentJson: string; status: 'draft' | 'published' }) => Promise<void>;
}

export function BlogEditor({ post, isSaving, onCancel, onSave }: BlogEditorProps) {
  const [title, setTitle] = useState(post?.title ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const editor = useEditor({
    extensions: [StarterKit],
    content: post ? safeParseBlogContent(post.contentJson) : EMPTY_BLOG_CONTENT,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[280px] px-4 py-3 text-slate-200 focus:outline-none prose-headings:text-white prose-strong:text-white',
      },
    },
  });

  useEffect(() => {
    setTitle(post?.title ?? '');
    setExcerpt(post?.excerpt ?? '');
    if (editor) {
      editor.commands.setContent(post ? safeParseBlogContent(post.contentJson) : EMPTY_BLOG_CONTENT);
    }
  }, [editor, post]);

  async function submit(event: FormEvent, status: 'draft' | 'published') {
    event.preventDefault();
    if (!editor || !title.trim()) return;

    await onSave({
      title: title.trim(),
      excerpt: excerpt.trim(),
      contentJson: JSON.stringify(editor.getJSON()),
      status,
    });
  }

  return (
    <form className="rounded-xl border border-white/10 bg-slate-800/50 p-5" onSubmit={(event) => submit(event, 'draft')}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">{post ? 'Edit Post' : 'New Post'}</h2>
          <p className="text-sm text-slate-400">Save drafts privately or publish them to the public blog.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          title="Close editor"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1.2fr]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Post title"
          className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
        />
        <input
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          placeholder="Short excerpt"
          className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
        <div className="flex items-center gap-1 border-b border-white/10 bg-slate-800/80 px-2 py-2">
          <EditorButton title="Bold" active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </EditorButton>
          <EditorButton title="Italic" active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </EditorButton>
          <div className="mx-1 h-5 w-px bg-white/10" />
          <EditorButton title="Bullet list" active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </EditorButton>
          <EditorButton title="Numbered list" active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" />
          </EditorButton>
        </div>
        <EditorContent editor={editor} />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="submit"
          disabled={isSaving || !title.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Save Draft
        </button>
        <button
          type="button"
          onClick={(event) => submit(event, 'published')}
          disabled={isSaving || !title.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 font-bold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Publish
        </button>
      </div>
    </form>
  );
}

function EditorButton({ active, children, onClick, title }: { active?: boolean; children: ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-lg p-2 transition-colors ${active ? 'bg-amber-500/15 text-amber-300' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
    >
      {children}
    </button>
  );
}
