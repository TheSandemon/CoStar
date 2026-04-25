'use client';

import { useState, useCallback } from 'react';
import type { TranscriptEntry } from '@/lib/audition/types';

let idCounter = 0;
function nextId() {
  return `t-${++idCounter}-${Date.now()}`;
}

export function useTranscript() {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);

  const addPartial = useCallback((role: 'ai' | 'user', text: string) => {
    setEntries((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && !last.isFinal) {
        return [...prev.slice(0, -1), { ...last, text: last.text + text, timestamp: Date.now() }];
      }
      return [
        ...prev,
        { id: nextId(), role, text, timestamp: Date.now(), isFinal: false },
      ];
    });
  }, []);

  const finalizeLast = useCallback((role: 'ai' | 'user') => {
    setEntries((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && !last.isFinal) {
        return [...prev.slice(0, -1), { ...last, isFinal: true }];
      }
      return prev;
    });
  }, []);

  const reset = useCallback(() => {
    setEntries([]);
  }, []);

  return { entries, addPartial, finalizeLast, reset };
}
