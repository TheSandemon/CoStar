import {
  doc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { AccountType } from './profile';

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected';

export interface ConnectionRecord {
  id: string;
  requesterId: string;
  targetId: string;
  requesterRole: AccountType;
  targetRole: AccountType;
  status: ConnectionStatus;
  createdAt: any;
  updatedAt: any;
}

export interface Connection {
  id: string;
  initiatedBy: string;
  recipientId: string;
  status: 'pending' | 'connected';
}

export function getConnectionLabel(viewerRole: AccountType, targetRole: AccountType, status?: ConnectionStatus | null): string {
  if (viewerRole === 'talent' && targetRole === 'talent') return status === 'accepted' ? 'Synced' : 'Sync';
  if (viewerRole === 'talent' && targetRole === 'business') return status ? 'Tracking' : 'Track'; // one-way
  if (viewerRole === 'business' && targetRole === 'talent') return status === 'accepted' ? 'Aligned' : 'Shortlist';
  if (viewerRole === 'talent' && targetRole === 'agency') return status === 'accepted' ? 'Represented' : 'Apply';
  if (viewerRole === 'agency' && targetRole === 'talent') return status === 'accepted' ? 'Roster' : 'Scout';
  if (viewerRole === 'agency' && targetRole === 'business') return status === 'accepted' ? 'Partnered' : 'Partner';
  return 'Connect';
}

export async function getConnection(viewerId: string, targetId: string): Promise<ConnectionRecord | null> {
  if (!db) throw new Error('Firestore not initialized');
  const connectionsRef = collection(db, 'connections');
  
  // Check if viewer requested target
  const q1 = query(connectionsRef, where('requesterId', '==', viewerId), where('targetId', '==', targetId));
  const snap1 = await getDocs(q1);
  if (!snap1.empty) return { id: snap1.docs[0].id, ...snap1.docs[0].data() } as ConnectionRecord;

  // Check if target requested viewer
  const q2 = query(connectionsRef, where('requesterId', '==', targetId), where('targetId', '==', viewerId));
  const snap2 = await getDocs(q2);
  if (!snap2.empty) return { id: snap2.docs[0].id, ...snap2.docs[0].data() } as ConnectionRecord;

  return null;
}

export async function getConnectionStatus(viewerId: string, targetId: string): Promise<Connection | null> {
  const connection = await getConnection(viewerId, targetId);
  if (!connection) return null;

  return {
    id: connection.id,
    initiatedBy: connection.requesterId,
    recipientId: connection.targetId,
    status: connection.status === 'accepted' ? 'connected' : 'pending',
  };
}

export async function sendConnect(requesterId: string, targetId: string): Promise<void> {
  await requestConnection(requesterId, targetId, 'talent', 'talent');
}

export async function acceptConnect(currentUid: string, targetUid: string): Promise<void> {
  const connection = await getConnection(currentUid, targetUid);
  if (!connection) return;
  await updateConnectionStatus(connection.id, 'accepted');
}

export async function removeConnect(currentUid: string, targetUid: string): Promise<void> {
  const connection = await getConnection(currentUid, targetUid);
  if (!connection) return;
  await removeConnection(connection.id);
}

export async function requestConnection(
  requesterId: string,
  targetId: string,
  requesterRole: AccountType,
  targetRole: AccountType,
  autoAccept: boolean = false
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const connectionsRef = collection(db, 'connections');
  const existing = await getConnection(requesterId, targetId);
  
  if (existing) {
    if (existing.status === 'pending' && autoAccept) {
       await updateDoc(doc(db, 'connections', existing.id), {
         status: 'accepted',
         updatedAt: serverTimestamp()
       });
    }
    return;
  }
  
  const newRef = doc(connectionsRef);
  await setDoc(newRef, {
    id: newRef.id,
    requesterId,
    targetId,
    requesterRole,
    targetRole,
    status: autoAccept ? 'accepted' : 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateConnectionStatus(connectionId: string, status: ConnectionStatus): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  await updateDoc(doc(db, 'connections', connectionId), {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function removeConnection(connectionId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  await deleteDoc(doc(db, 'connections', connectionId));
}
