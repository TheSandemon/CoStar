'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Conversation, subscribeToConversations } from '@/lib/messaging';
import InboxList from '@/components/messaging/InboxList';
import { usePathname } from 'next/navigation';

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToConversations(user.uid, (data) => {
      setConversations(data);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading messages...</div>;
  }

  if (!user) {
    return <div className="p-8 text-center text-slate-400">Please sign in to view messages.</div>;
  }

  // Determine if we are on a specific conversation page
  const isChatView = pathname.startsWith('/messages/') && pathname !== '/messages';
  const activeConversationId = isChatView ? pathname.split('/').pop() : undefined;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-100px)] flex border border-white/10 rounded-xl overflow-hidden bg-slate-900/50 mt-6">
      {/* Sidebar - hidden on mobile if viewing a chat */}
      <div className={`${isChatView ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-white/10 bg-slate-800/20`}>
        <div className="p-4 border-b border-white/10 bg-slate-800/40">
          <h2 className="font-semibold text-lg">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <InboxList 
            conversations={conversations} 
            currentUserId={user.uid} 
            activeConversationId={activeConversationId} 
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`${isChatView ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-slate-900/80 relative`}>
        {children}
      </div>
    </div>
  );
}
