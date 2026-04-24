'use client';

import { useState, useRef, useCallback } from 'react';
import { base64ToInt16, int16ToFloat32 } from '@/lib/audition/audioUtils';
import { GEMINI_CONFIG } from '@/lib/audition/config';

const PLAYBACK_SAMPLE_RATE = GEMINI_CONFIG.outputSampleRate;

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const getContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const ctx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      nextStartTimeRef.current = 0;
    }
    return { ctx: audioCtxRef.current, analyser: analyserRef.current! };
  }, []);

  const enqueueChunk = useCallback(
    async (base64PCM: string) => {
      try {
        const { ctx, analyser } = getContext();

        // Resume context if suspended (browser autoplay policy)
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const int16 = base64ToInt16(base64PCM);
        const float32 = int16ToFloat32(int16);

        const buffer = ctx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
        buffer.copyToChannel(new Float32Array(float32), 0);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(analyser);

        const now = ctx.currentTime;
        const startAt = Math.max(now, nextStartTimeRef.current);
        source.start(startAt);
        nextStartTimeRef.current = startAt + buffer.duration;

        activeSourcesRef.current.push(source);
        setIsPlaying(true);

        source.onended = () => {
          activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
          if (activeSourcesRef.current.length === 0) {
            setIsPlaying(false);
          }
        };
      } catch {
        // Ignore decode errors on bad chunks
      }
    },
    [getContext],
  );

  const stop = useCallback(() => {
    activeSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {
        // already stopped
      }
    });
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;
    setIsPlaying(false);
  }, []);

  const close = useCallback(() => {
    stop();
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, [stop]);

  return { isPlaying, enqueueChunk, stop, close, analyserRef };
}
