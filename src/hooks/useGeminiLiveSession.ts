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
    async (token: string, systemPrompt: string, config: AuditionConfig, overrides?: GeminiSessionOverrides) => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const host = overrides?.liveApiHost ?? GEMINI_CONFIG.liveApiHost;
      const model = overrides?.liveModel ?? GEMINI_CONFIG.liveModel;
      const voice = overrides?.voiceName ?? GEMINI_CONFIG.voiceName;

      const url = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?access_token=${token}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setAIStatus('processing');

        // Send setup message
        const setup = {
          setup: {
            model,
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            generation_config: {
              response_modalities: GEMINI_CONFIG.responseModalities,
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: voice,
                  },
                },
              },
            },
            input_audio_transcription: {},
            output_audio_transcription: {},
          },
        };
        ws.send(JSON.stringify(setup));
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        callbacksRef.current.onError('Connection error. Please try again.');
        setIsConnected(false);
        setAIStatus('idle');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setAIStatus('idle');
      };
    },
    [handleMessage],
  );

  const sendAudioChunk = useCallback((base64PCM: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const msg = {
      realtime_input: {
        audio: {
          data: base64PCM,
          mime_type: `audio/pcm;rate=${GEMINI_CONFIG.inputSampleRate}`,
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
