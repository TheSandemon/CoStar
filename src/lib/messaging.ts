import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export interface Participant {
  uid: string;
  name: string;
  avatarUrl: string | null;
  role: 'talent' | 'business' | 'agency';
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: Record<string, Participant>;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
    isRead: boolean;
  };
  lastUpdatedAt: any;
  status: 'active' | 'archived' | 'blocked';
}

export interface Message {
  id: string;
  senderId: string;
  content: string; // JSON string of TipTap document
  createdAt: any;
  readBy: string[];
}

/**
 * Gets an existing conversation for the exact participants or creates a new one.
 */
export async function getOrCreateConversation(
  participants: Record<string, Participant>
): Promise<string> {
  const pIds = Object.keys(participants);
  if (pIds.length < 2) throw new Error("Need at least 2 participants");
  
  const q = query(
    collection(db as any, 'conversations'),
    where('participantIds', 'array-contains', pIds[0])
  );
  
  const snapshot = await getDocs(q);
  let existingId: string | null = null;
  
  snapshot.forEach(docSnap => {
    const data = docSnap.data() as Conversation;
    // Check exact match (ignoring order)
    if (
      data.participantIds.length === pIds.length &&
      pIds.every(id => data.participantIds.includes(id))
    ) {
      existingId = docSnap.id;
    }
  });
  
  if (existingId) return existingId;
  
  // Create new
  const convRef = doc(collection(db as any, 'conversations'));
  const newConv: Omit<Conversation, 'id'> = {
    participantIds: pIds,
    participants,
    lastUpdatedAt: serverTimestamp(),
    status: 'active',
  };
  
  await setDoc(convRef, newConv);
  return convRef.id;
}

/**
 * Subscribes to all conversations for a specific user.
 */
export function subscribeToConversations(userId: string, callback: (conversations: Conversation[]) => void) {
  const q = query(
    collection(db as any, 'conversations'),
    where('participantIds', 'array-contains', userId),
    orderBy('lastUpdatedAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const convs: Conversation[] = [];
    snapshot.forEach(docSnap => {
      convs.push({ id: docSnap.id, ...docSnap.data() } as Conversation);
    });
    callback(convs);
  });
}

/**
 * Subscribes to all messages in a conversation.
 */
export function subscribeToMessages(conversationId: string, callback: (messages: Message[]) => void) {
  const q = query(
    collection(db as any, `conversations/${conversationId}/messages`),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const msgs: Message[] = [];
    snapshot.forEach(docSnap => {
      msgs.push({ id: docSnap.id, ...docSnap.data() } as Message);
    });
    callback(msgs);
  });
}

/**
 * Sends a message and updates the conversation's lastMessage metadata.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string, // TipTap JSON string
  previewText: string
) {
  const msgRef = collection(db as any, `conversations/${conversationId}/messages`);
  await addDoc(msgRef, {
    senderId,
    content,
    createdAt: serverTimestamp(),
    readBy: [senderId],
  });
  
  // Update conversation last message
  const convRef = doc(db as any, 'conversations', conversationId);
  await updateDoc(convRef, {
    lastMessage: {
      text: previewText,
      senderId,
      timestamp: serverTimestamp(),
      isRead: false,
    },
    lastUpdatedAt: serverTimestamp(),
  });
}

/**
 * Marks a conversation's last message as read if the user is not the sender.
 */
export async function markConversationRead(conversationId: string, userId: string) {
  const convRef = doc(db as any, 'conversations', conversationId);
  const snap = await getDoc(convRef);
  if (snap.exists()) {
    const data = snap.data() as Conversation;
    if (data.lastMessage && data.lastMessage.senderId !== userId && !data.lastMessage.isRead) {
      await updateDoc(convRef, {
        'lastMessage.isRead': true
      });
    }
  }
}
