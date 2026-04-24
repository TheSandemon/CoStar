'use client';

import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Message, Participant, sendMessage, markConversationRead } from '@/lib/messaging';
import RichTextEditor from './RichTextEditor';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface ChatWindowProps {
  conversationId: string;
  messages: Message[];
  currentUserId: string;
  participants: Record<string, Participant>;
}

// Sub-component for rendering rich text safely
function RichTextContent({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: (() => {
      try {
        return JSON.parse(content);
      } catch (e) {
        return content;
      }
    })(),
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none',
      },
    },
  });

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}

export default function ChatWindow({ conversationId, messages, currentUserId, participants }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    markConversationRead(conversationId, currentUserId);
  }, [messages, conversationId, currentUserId]);

  const handleSend = async (content: string, previewText: string) => {
    await sendMessage(conversationId, currentUserId, content, previewText);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUserId;
          const sender = participants[msg.senderId];
          
          // Group messages closely if they are from the same person within 5 minutes
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const showHeader = !prevMsg || prevMsg.senderId !== msg.senderId || (msg.createdAt?.toDate && prevMsg.createdAt?.toDate && msg.createdAt.toDate().getTime() - prevMsg.createdAt.toDate().getTime() > 5 * 60 * 1000);

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {showHeader && (
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-300">
                    {isMe ? 'You' : sender?.name || 'Unknown User'}
                  </span>
                  {msg.createdAt?.toDate && (
                    <span className="text-xs text-slate-500">
                      {format(msg.createdAt.toDate(), 'h:mm a')}
                    </span>
                  )}
                </div>
              )}
              
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  isMe 
                    ? 'bg-amber-500/10 border border-amber-500/20 text-slate-200 rounded-tr-sm' 
                    : 'bg-slate-800 border border-white/10 text-slate-200 rounded-tl-sm'
                }`}
              >
                <RichTextContent content={msg.content} />
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-slate-900/50">
        <RichTextEditor onSend={handleSend} />
      </div>
    </div>
  );
}
