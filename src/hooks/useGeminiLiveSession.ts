'use client';

import { useState, useRef, useCallback } from 'react';
import type { AIStatus, AuditionConfig } from '@/lib/audition/types';
import { GEMINI_CONFIG } from '@/lib/audition/config';

interface UseGeminiLiveSessionOptions {
  onAudioChunk: (base64PCM: string) => void;
  onAITranscript: (text: string, isFinal: boolean) => void;
  onUserTranscript: (text: string, isFinal: boolean) => void;
  onTurnComplete: () => void;
  onInterviewComplete: () => void;
  onError: (msg: string) => void;
}

export interface GeminiSessionOverrides {
  liveModel?: string;
  liveApiHost?: string;
  voiceName?: string;
}

export interface GeminiSessionCredentials {
  key: string;
  host: string;
  liveModel?: string;
}

export function useGeminiLiveSession({
  onAudioChunk,
  onAITranscript,
  onUserTranscript,
  onTurnComplete,
  onInterviewComplete,
  onError,
}: UseGeminiLiveSessionOptions) {
  const [aiStatus, setAIStatus] = useState<AIStatus>('idle');
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef({
    onAudioChunk,
    onAITranscript,
    onUserTranscript,
    onTurnComplete,
    onInterviewComplete,
    onError,
  });
  callbacksRef.current = {
    onAudioChunk,
    onAITranscript,
    onUserTranscript,
    onTurnComplete,
    onInterviewComplete,
    onError,
  };

  const handleMessage = useCallback((event: MessageEvent) => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(event.data as string);
    } catch {
      return;
    }

    // Check for API errors sent via WebSocket
    if (data.error) {
      const errMsg = (data.error as any).message || JSON.stringify(data.error);
      callbacksRef.current.onError(`API Error: ${errMsg}`);
      if (wsRef.current) wsRef.current.close();
      return;
    }

    // Setup confirmation
    if (data.setupComplete) {
      setAIStatus('listening');
      return;
    }

    const serverContent = data.serverContent as Record<string, unknown> | undefined;
    if (!serverContent) return;

    // Audio chunks from the model turn
    const modelTurn = serverContent.modelTurn as Record<string, unknown> | undefined;
    if (modelTurn) {
      const parts = modelTurn.parts as Array<Record<string, unknown>> | undefined;
      if (parts) {
        for (const part of parts) {
          const inlineData = part.inlineData as Record<string, unknown> | undefined;
          if (inlineData?.data && typeof inlineData.data === 'string') {
            setAIStatus('speaking');
            callbacksRef.current.onAudioChunk(inlineData.data);
          }
        }
      }
    }

    // AI (output) transcription
    const outputTranscription = serverContent.outputTranscription as
      | Record<string, unknown>
      | undefined;
    if (outputTranscription?.text && typeof outputTranscription.text === 'string') {
      const text = outputTranscription.text;
      callbacksRef.current.onAITranscript(text, false);
      if (text.includes('INTERVIEW_COMPLETE')) {
        callbacksRef.current.onInterviewComplete();
      }
    }

    // User (input) transcription
    const inputTranscription = serverContent.inputTranscription as
      | Record<string, unknown>
      | undefined;
    if (inputTranscription?.text && typeof inputTranscription.text === 'string') {
      callbacksRef.current.onUserTranscript(inputTranscription.text, false);
    }

    // Turn complete — model finished speaking
    if (serverContent.turnComplete) {
      setAIStatus('listening');
      callbacksRef.current.onTurnComplete();
    }

    // Interrupted by user speech
    if (serverContent.interrupted) {
      setAIStatus('listening');
    }
  }, []);

  const connect = useCallback(
    (credentials: GeminiSessionCredentials, systemPrompt: string, config: AuditionConfig, overrides?: GeminiSessionOverrides): Promise<void> => {
      return new Promise((resolve, reject) => {
        let isOpened = false;

        if (wsRef.current) {
          wsRef.current.close();
        }

        const host = overrides?.liveApiHost ?? credentials.host;
        const model = overrides?.liveModel ?? credentials.liveModel ?? GEMINI_CONFIG.liveModel;
        const voice = overrides?.voiceName ?? GEMINI_CONFIG.voiceName;

        // gemini-3.1-flash-live-preview only exists in v1alpha — v1beta returns 1008 "not found".
        // Direct ?key= auth works fine on v1alpha BidiGenerateContent (non-Constrained).
        // Do NOT use BidiGenerateContentConstrained — that requires ephemeral tokens which
        // fail with 1007 "project-scoped" for this model.
        const url = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${credentials.key}`;
        const urlSafe = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=REDACTED`;
        console.log('[GeminiLive] Connecting to:', urlSafe, '| model:', model);
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          isOpened = true;
          setIsConnected(true);
          setAIStatus('processing');

          // Send setup message — top-level key must be "setup" per official Google sample
          const setup = {
            setup: {
              model,
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              generationConfig: {
                responseModalities: GEMINI_CONFIG.responseModalities,
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: voice,
                    },
                  },
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
          };
          ws.send(JSON.stringify(setup));
          resolve();
        };

        ws.onmessage = handleMessage;

        ws.onerror = () => {
          setIsConnected(false);
          setAIStatus('idle');
          if (wsRef.current === ws) wsRef.current = null;
          
          if (!isOpened) {
            reject(new Error('Connection error. Please try again.'));
          } else {
            callbacksRef.current.onError('Connection error. Please try again.');
          }
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          setAIStatus('idle');
          if (wsRef.current === ws) wsRef.current = null;
          
          if (!isOpened) {
            reject(new Error(`Connection closed before opening. Code: ${event.code}. Reason: ${event.reason} | URL: ${urlSafe} | model: ${model}`));
          } else if (event.code !== 1000 && event.code !== 1005) {
            callbacksRef.current.onError(`Connection lost. Code: ${event.code}. Reason: ${event.reason}`);
          }
        };
      });
    },
    [handleMessage],
  );

  const sendAudioChunk = useCallback((base64PCM: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const msg = {
      realtimeInput: {
        audio: {
          data: base64PCM,
          mimeType: `audio/pcm;rate=${GEMINI_CONFIG.inputSampleRate}`,
        },
      },
    };
    wsRef.current.send(JSON.stringify(msg));
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    setAIStatus('idle');
  }, []);

  return { aiStatus, isConnected, connect, sendAudioChunk, disconnect };
}
