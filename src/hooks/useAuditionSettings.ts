'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GEMINI_CONFIG } from '@/lib/audition/config';

export interface AuditionSettings {
  geminiApiKey: string;
  liveApiHost: string;
  liveModel: string;
  feedbackModel: string;
  voiceName: string;
}

export const AUDITION_SETTINGS_DEFAULTS: AuditionSettings = {
  geminiApiKey: '',
  liveApiHost: GEMINI_CONFIG.liveApiHost,
  liveModel: GEMINI_CONFIG.liveModel,
  feedbackModel: GEMINI_CONFIG.feedbackModel,
  voiceName: GEMINI_CONFIG.voiceName,
};

export function useAuditionSettings(uid: string | null) {
  const [settings, setSettings] = useState<AuditionSettings>(AUDITION_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid || !db) return;
    setLoading(true);
    getDoc(doc(db, 'auditionSettings', uid))
      .then((snap) => {
        if (snap.exists()) {
          setSettings({ ...AUDITION_SETTINGS_DEFAULTS, ...(snap.data() as Partial<AuditionSettings>) });
        }
      })
      .finally(() => setLoading(false));
  }, [uid]);

  const save = useCallback(
    async (next: AuditionSettings) => {
      if (!uid || !db) return;
      await setDoc(doc(db, 'auditionSettings', uid), next);
      setSettings(next);
    },
    [uid],
  );

  return { settings, loading, save };
}
