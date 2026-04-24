'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Conversation } from '@/lib/messaging';

interface InboxListProps {
  conversations: Conversation[];
  currentUserId: string;
  activeConversationId?: string;
}

export default function InboxList({ conversations, currentUserId, activeConversationId }: InboxListProps) {
  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        No messages yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-white/5">
      {conversations.map((conv) => {
        // Find the other participant
        const otherParticipantId = conv.participantIds.find(id => id !== currentUserId) || conv.participantIds[0];
        const otherParticipant = conv.participants[otherParticipantId];
        
        const isUnread = conv.lastMessage && !conv.lastMessage.isRead && conv.lastMessage.senderId !== currentUserId;
        const isActive = conv.id === activeConversationId;
        
        const timestamp = conv.lastUpdatedAt?.toDate ? conv.lastUpdatedAt.toDate() : new Date();

        return (
          <Link 
            key={conv.id} 
            href={`/messages/${conv.id}`}
            className={`p-4 hover:bg-white/5 transition-colors flex items-start gap-4 ${isActive ? 'bg-white/5' : ''}`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              {otherParticipant?.avatarUrl ? (
                <img src={otherParticipant.avatarUrl} alt={otherParticipant.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-sm font-medium text-slate-300">
                  {otherParticipant?.name?.charAt(0) || '?'}
                </span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className={`truncate font-medium ${isUnread ? 'text-white' : 'text-slate-200'}`}>
                  {otherParticipant?.name || 'Unknown User'}
                </h3>
                <span className="text-xs text-slate-500 shrink-0">
                  {formatDistanceToNow(timestamp, { addSuffix: true })}
                </span>
              </div>
              
              {conv.lastMessage ? (
                <p className={`text-sm truncate mt-1 ${isUnread ? 'text-amber-400 font-medium' : 'text-slate-400'}`}>
                  {conv.lastMessage.senderId === currentUserId ? 'You: ' : ''}
                  {conv.lastMessage.text}
                </p>
              ) : (
                <p className="text-sm text-slate-500 italic mt-1">New conversation</p>
              )}
            </div>
            
            {isUnread && (
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shrink-0 mt-1.5" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
