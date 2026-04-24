import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export type ConnectionStatus = 'pending' | 'connected';

export interface Connection {
  uid1: string; // lexicographically smaller uid
  uid2: string;
  initiatedBy: string;
  status: ConnectionStatus;
  createdAt: any;
  updatedAt: any;
}

// Canonical doc ID: always sort so uid1 < uid2
function connectionDocId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export async function getConnectionStatus(
  uidA: string,
  uidB: string
): Promise<Connection | null> {
  if (!db) throw new Error('Firestore not initialized');
  const ref = doc(db, 'connections', connectionDocId(uidA, uidB));
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Connection) : null;
}

export async function sendConnect(fromUid: string, toUid: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const [uid1, uid2] = [fromUid, toUid].sort();
  const ref = doc(db, 'connections', connectionDocId(fromUid, toUid));
  await setDoc(ref, {
    uid1,
    uid2,
    initiatedBy: fromUid,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function acceptConnect(fromUid: string, toUid: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const ref = doc(db, 'connections', connectionDocId(fromUid, toUid));
  await updateDoc(ref, { status: 'connected', updatedAt: serverTimestamp() });
}

export async function removeConnect(uidA: string, uidB: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const ref = doc(db, 'connections', connectionDocId(uidA, uidB));
  await deleteDoc(ref);
}

// Requires Firestore composite indexes on:
//   connections: (uid1, status) and (uid2, status)
export async function getConnections(uid: string): Promise<Connection[]> {
  if (!db) throw new Error('Firestore not initialized');
  const col = collection(db, 'connections');
  const [snap1, snap2] = await Promise.all([
    getDocs(query(col, where('uid1', '==', uid))),
    getDocs(query(col, where('uid2', '==', uid))),
  ]);
  return [...snap1.docs, ...snap2.docs].map((d) => d.data() as Connection);
}
