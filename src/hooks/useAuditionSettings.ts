'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GEMINI_CONFIG } from '@/lib/audition/config';
import type { AuditionPreset } from '@/lib/audition/types';

export interface AuditionSettings {
  geminiApiKey: string;
  liveApiHost: string;
  voiceName: string;
  presets: AuditionPreset[];
}

export const AUDITION_SETTINGS_DEFAULTS: AuditionSettings = {
  geminiApiKey: '',
  liveApiHost: GEMINI_CONFIG.liveApiHost,
  voiceName: GEMINI_CONFIG.voiceName,
  presets: [],
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
          const data = snap.data() as Partial<AuditionSettings>;
          setSettings({
            ...AUDITION_SETTINGS_DEFAULTS,
            ...data,
            presets: data.presets ?? [],
          });
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
