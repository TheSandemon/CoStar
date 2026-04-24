'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Message, subscribeToMessages, Conversation } from '@/lib/messaging';
import ChatWindow from '@/components/messaging/ChatWindow';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ConversationPage({ params }: { params: { conversationId: string } }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Fetch conversation details once
    const fetchConv = async () => {
      const snap = await getDoc(doc(db as any, 'conversations', params.conversationId));
      if (snap.exists()) {
        setConversation({ id: snap.id, ...snap.data() } as Conversation);
      }
    };
    fetchConv();

    // Subscribe to messages
    const unsubscribe = subscribeToMessages(params.conversationId, setMessages);
    return () => unsubscribe();
  }, [params.conversationId, user]);

  if (!user) return null;

  if (!conversation) {
    return <div className="flex-1 flex items-center justify-center text-slate-400">Loading conversation...</div>;
  }

  // Find the other participant
  const otherParticipantId = conversation.participantIds.find(id => id !== user.uid) || conversation.participantIds[0];
  const otherParticipant = conversation.participants[otherParticipantId];

  return (
    <div className="flex flex-col h-full w-full">
      {/* Mobile back button & Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-slate-800/40">
        <Link href="/messages" className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
          {otherParticipant?.avatarUrl ? (
            <img src={otherParticipant.avatarUrl} alt={otherParticipant.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <span className="text-xs font-medium text-slate-300">
              {otherParticipant?.name?.charAt(0) || '?'}
            </span>
          )}
        </div>
        <div>
          <h2 className="font-medium text-white">{otherParticipant?.name || 'Unknown User'}</h2>
          <p className="text-xs text-slate-400 capitalize">{otherParticipant?.role || 'User'}</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden h-full">
        <ChatWindow 
          conversationId={params.conversationId}
          messages={messages}
          currentUserId={user.uid}
          participants={conversation.participants}
        />
      </div>
    </div>
  );
}
