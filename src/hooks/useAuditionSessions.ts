'use client';

import { useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { stripUndefinedFields } from '@/lib/audition/sessionSerialization';
import type { AuditionSession } from '@/lib/audition/types';

export function useAuditionSessions(uid: string | null) {
  const saveSession = useCallback(
    async (session: AuditionSession) => {
      if (!uid || !db) return;
      await setDoc(
        doc(db, 'auditionSessions', uid, 'sessions', session.id),
        stripUndefinedFields(session),
      );
    },
    [uid],
  );

  const getSessions = useCallback(async (): Promise<AuditionSession[]> => {
    if (!uid || !db) return [];
    const q = query(
      collection(db, 'auditionSessions', uid, 'sessions'),
      orderBy('date', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AuditionSession);
  }, [uid]);

  const getSession = useCallback(
    async (sessionId: string): Promise<AuditionSession | null> => {
      if (!uid || !db) return null;
      const snap = await getDoc(
        doc(db, 'auditionSessions', uid, 'sessions', sessionId),
      );
      return snap.exists() ? (snap.data() as AuditionSession) : null;
    },
    [uid],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!uid || !db) return;
      await deleteDoc(doc(db, 'auditionSessions', uid, 'sessions', sessionId));
    },
    [uid],
  );

  return { saveSession, getSessions, getSession, deleteSession };
}
