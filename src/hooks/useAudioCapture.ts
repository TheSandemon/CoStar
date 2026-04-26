'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { float32ToInt16, int16ToBase64, resampleFloat32PCM } from '@/lib/audition/audioUtils';
import { GEMINI_CONFIG } from '@/lib/audition/config';

interface UseAudioCaptureOptions {
  onChunk: (base64PCM: string) => void;
}

export type MicConnectionStatus = 'unsupported' | 'unknown' | 'prompt' | 'granted' | 'denied' | 'capturing' | 'error';

export function useAudioCapture({ onChunk }: UseAudioCaptureOptions) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | 'unsupported' | 'unknown'>('unknown');

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pausedRef = useRef(false);
  const loggedFirstChunkRef = useRef(false);
  const onChunkRef = useRef(onChunk);
  onChunkRef.current = onChunk;

  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;
    let handleChange: (() => void) | null = null;
    let disposed = false;

    async function readPermissionStatus() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionState('unsupported');
        return;
      }

      if (!navigator.permissions?.query) {
        setPermissionState('unknown');
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (disposed) return;

        const updateState = () => setPermissionState(permissionStatus?.state ?? 'unknown');
        handleChange = updateState;
        updateState();
        permissionStatus.addEventListener('change', updateState);
      } catch {
        setPermissionState('unknown');
      }
    }

    readPermissionStatus();

    return () => {
      disposed = true;
      if (permissionStatus && handleChange) {
        permissionStatus.removeEventListener('change', handleChange);
      }
    };
  }, []);

  const requestPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = 'Microphone requires a secure connection (HTTPS or localhost).';
      setError(msg);
      return { granted: false, errorText: msg };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);
      setPermissionState('granted');
      setError(null);
      try { localStorage.setItem('micPermissionGranted', 'true'); } catch (e) {}
      return { granted: true };
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      const raw = err instanceof Error ? err.message : String(err);
      let msg: string;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        msg = "Browser blocked microphone access. Click the lock icon in the address bar and allow Microphone.";
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        msg = "Windows is blocking microphone access. Go to: Windows Settings → Privacy & Security → Microphone → turn ON 'Let apps access your microphone' AND enable your browser (Chrome/Edge) in the list below.";
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        msg = 'Microphone is in use by another app. Close other apps using the mic and try again.';
      } else if (name === 'OverconstrainedError') {
        msg = 'Microphone does not support the required audio format. Try a different device.';
      } else {
        msg = `Microphone error (${name || 'unknown'}): ${raw}`;
      }
      setError(msg);
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPermissionState('denied');
      }
      return { granted: false, errorText: msg };
    }
  }, []);

  const preloadPermission = useCallback(async () => {
    if (localStorage.getItem('micPermissionGranted') === 'true') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      localStorage.setItem('micPermissionGranted', 'true');
    } catch {
      // silent — main requestPermission will surface the real error
    }
  }, []);

  const diagnoseMic = useCallback(async () => {
    const lines: string[] = [];
    try {
      if (!navigator.mediaDevices) {
        return ['navigator.mediaDevices is undefined — not a secure context (need HTTPS or localhost).'];
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      if (audioInputs.length === 0) {
        lines.push('No audioinput devices found by the browser.');
        lines.push('This usually means Windows Privacy Settings are blocking device enumeration.');
        lines.push('Fix: Windows Settings → Privacy & Security → Microphone → Enable for this browser.');
      } else {
        lines.push(`Found ${audioInputs.length} audio input device(s):`);
        audioInputs.forEach((d, i) => {
          lines.push(`  [${i + 1}] ${d.label || '(label hidden — permission not yet granted)'} | id: ${d.deviceId.slice(0, 16)}...`);
        });
        if (audioInputs.every((d) => !d.label)) {
          lines.push('');
          lines.push('All labels are hidden — browser has no mic permission yet. Click Test Microphone to grant it.');
        }
      }
    } catch (err) {
      lines.push(`enumerateDevices() threw: ${err instanceof Error ? err.message : String(err)}`);
    }
    return lines;
  }, []);

  const startCapture = useCallback(async () => {
    if (!streamRef.current) return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      setError('This browser does not support microphone audio capture.');
      return;
    }

    const ctx = new AudioContextCtor({ sampleRate: GEMINI_CONFIG.inputSampleRate });
    audioContextRef.current = ctx;
    loggedFirstChunkRef.current = false;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const source = ctx.createMediaStreamSource(streamRef.current);
    sourceRef.current = source;

    // ScriptProcessorNode bufferSize 4096 @ 16kHz ≈ 256ms chunks
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (pausedRef.current) return;
      const input = e.inputBuffer.getChannelData(0);
      const sourceSampleRate = e.inputBuffer.sampleRate || ctx.sampleRate;
      const resampled = resampleFloat32PCM(input, sourceSampleRate, GEMINI_CONFIG.inputSampleRate);
      const pcm = float32ToInt16(resampled);
      const base64 = int16ToBase64(pcm);
      if (!loggedFirstChunkRef.current) {
        loggedFirstChunkRef.current = true;
        console.log('[AudioCapture] first chunk', {
          sourceSampleRate,
          contextSampleRate: ctx.sampleRate,
          targetSampleRate: GEMINI_CONFIG.inputSampleRate,
          sourceFrames: input.length,
          resampledFrames: resampled.length,
          base64Length: base64.length,
        });
      }
      onChunkRef.current(base64);
    };

    source.connect(processor);
    processor.connect(ctx.destination);
    setIsCapturing(true);
  }, []);

  const stopCapture = useCallback(() => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    processorRef.current = null;
    sourceRef.current = null;
    audioContextRef.current = null;
    streamRef.current = null;
    setIsCapturing(false);
  }, []);

  // Pause/resume without stopping the stream (used while AI is speaking)
  const setPaused = useCallback((paused: boolean) => {
    pausedRef.current = paused;
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => {
      const next = !m;
      pausedRef.current = next;
      return next;
    });
  }, []);

  const micStatus: MicConnectionStatus = (() => {
    if (isCapturing) return 'capturing';
    if (error) return 'error';
    if (permissionState === 'unsupported') return 'unsupported';
    if (permissionState === 'denied') return 'denied';
    if (hasPermission || permissionState === 'granted') return 'granted';
    if (permissionState === 'prompt') return 'prompt';
    return 'unknown';
  })();

  return {
    hasPermission,
    isMuted,
    isCapturing,
    error,
    micStatus,
    permissionState,
    requestPermission,
    preloadPermission,
    diagnoseMic,
    startCapture,
    stopCapture,
    setPaused,
    toggleMute,
  };
}
