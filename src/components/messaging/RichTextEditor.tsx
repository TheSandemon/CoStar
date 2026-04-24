'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Send } from 'lucide-react';
import { useState, FormEvent, useEffect } from 'react';

interface RichTextEditorProps {
  onSend: (content: string, previewText: string) => void;
  disabled?: boolean;
}

export default function RichTextEditor({ onSend, disabled }: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[80px] px-4 py-3 text-slate-200 placeholder:text-slate-500',
      },
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editor || editor.isEmpty || disabled) return;

    // Extract JSON and a plain text preview
    const content = JSON.stringify(editor.getJSON());
    const previewText = editor.getText().slice(0, 100); // First 100 chars for preview

    onSend(content, previewText);
    editor.commands.clearContent();
  };

  if (!editor) {
    return <div className="h-32 bg-slate-800/50 animate-pulse rounded-lg border border-white/10" />;
  }

  return (
    <form onSubmit={handleSubmit} className={`border rounded-lg bg-slate-800/50 overflow-hidden transition-colors ${isFocused ? 'border-amber-500/50' : 'border-white/10'}`}>
      <div className="flex items-center gap-1 border-b border-white/5 px-2 py-1 bg-slate-800/80">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${editor.isActive('bold') ? 'text-amber-400 bg-white/5' : 'text-slate-400'}`}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${editor.isActive('italic') ? 'text-amber-400 bg-white/5' : 'text-slate-400'}`}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${editor.isActive('bulletList') ? 'text-amber-400 bg-white/5' : 'text-slate-400'}`}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${editor.isActive('orderedList') ? 'text-amber-400 bg-white/5' : 'text-slate-400'}`}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto cursor-text" onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} disabled={disabled} />
      </div>

      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-t border-white/5">
        <div className="text-xs text-slate-500">
          Rich text supported
        </div>
        <button
          type="submit"
          disabled={disabled || editor.isEmpty}
          className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-slate-900 rounded font-medium transition-colors"
        >
          <span>Send</span>
          <Send size={16} />
        </button>
      </div>
    </form>
  );
}
