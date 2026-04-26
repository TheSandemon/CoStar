'use client';

import { useState, useRef, useCallback } from 'react';
import type { AIStatus, AuditionConfig } from '@/lib/audition/types';
import { GEMINI_CONFIG } from '@/lib/audition/config';

interface FeedbackArgs {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface UseGeminiLiveSessionOptions {
  onAudioChunk: (base64PCM: string) => void;
  onAITranscript: (text: string, isFinal: boolean) => void;
  onUserTranscript: (text: string, isFinal: boolean) => void;
  onTurnComplete: () => void;
  onInterviewComplete: () => void;
  onError: (msg: string) => void;
  onFeedback?: (args: FeedbackArgs) => void;
  onInterrupted?: () => void;
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
  onFeedback,
  onInterrupted,
}: UseGeminiLiveSessionOptions) {
  const [aiStatus, setAIStatus] = useState<AIStatus>('idle');
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const setupReadyRef = useRef(false);
  const audioEnabledAtRef = useRef(0);
  const firstAudioSentRef = useRef(false);
  const toolCallInProgressRef = useRef(false);
  const callbacksRef = useRef({
    onAudioChunk,
    onAITranscript,
    onUserTranscript,
    onTurnComplete,
    onInterviewComplete,
    onError,
    onFeedback: onFeedback ?? null as ((args: FeedbackArgs) => void) | null,
    onInterrupted: onInterrupted ?? null as (() => void) | null,
  });
  callbacksRef.current = {
    onAudioChunk,
    onAITranscript,
    onUserTranscript,
    onTurnComplete,
    onInterviewComplete,
    onError,
    onFeedback: onFeedback ?? null,
    onInterrupted: onInterrupted ?? null,
  };

  const handleMessage = useCallback((data: Record<string, unknown>) => {
    // Check for API errors sent via WebSocket
    if (data.error) {
      const errMsg = (data.error as any).message || JSON.stringify(data.error);
      callbacksRef.current.onError(`API Error: ${errMsg}`);
      if (wsRef.current) wsRef.current.close();
      return;
    }

    // Setup confirmation
    if (data.setupComplete) {
      console.log('[GeminiLive] Received setupComplete — unblocking audio, triggering AI opening');
      setupReadyRef.current = true;
      audioEnabledAtRef.current = Date.now() + 750;
      firstAudioSentRef.current = false;
      setAIStatus('listening');
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          clientContent: {
            turns: [{ role: 'user', parts: [{ text: 'Hello.' }] }],
            turnComplete: true,
          },
        }));
      }
      return;
    }

    // Tool calls arrive at the top level, not inside serverContent
    if (data.toolCall) {
      toolCallInProgressRef.current = true;
      const calls = (data.toolCall as Record<string, unknown>).functionCalls as Array<{ id: string; name: string; args: unknown }> | undefined;
      if (calls) {
        // Send toolResponse back to server to satisfy API requirements
        const functionResponses = calls.map(call => ({
          id: call.id,
          name: call.name,
          response: { result: "success" }
        }));
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            toolResponse: {
              functionResponses
            }
          }));
        }

        toolCallInProgressRef.current = false;

        for (const call of calls) {
          if (call.name === 'generate_feedback' && callbacksRef.current.onFeedback) {
            callbacksRef.current.onFeedback(call.args as FeedbackArgs);
          }
        }
      }
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
            console.log('[GeminiLive] Received audio chunk, size:', inlineData.data.length);
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
      if (callbacksRef.current.onInterrupted) {
        callbacksRef.current.onInterrupted();
      }
    }
  }, []);

  const connect = useCallback(
    (credentials: GeminiSessionCredentials, systemPrompt: string, config: AuditionConfig, overrides?: GeminiSessionOverrides): Promise<void> => {
      return new Promise((resolve, reject) => {
        let isOpened = false;

        if (wsRef.current) {
          wsRef.current.close();
        }

        firstAudioSentRef.current = false;
        audioEnabledAtRef.current = 0;
        const host = overrides?.liveApiHost ?? credentials.host;
        const model = overrides?.liveModel ?? credentials.liveModel ?? GEMINI_CONFIG.liveModel;
        const voice = overrides?.voiceName ?? GEMINI_CONFIG.voiceName;

        // v1beta matches the working reference app configuration
        const url = `wss://${host}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${credentials.key}`;
        const urlSafe = `wss://${host}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=REDACTED`;
        console.log('[GeminiLive] Connecting to:', urlSafe, '| model:', model);
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          isOpened = true;
          setupReadyRef.current = false;
          audioEnabledAtRef.current = 0;
          firstAudioSentRef.current = false;
          setIsConnected(true);
          setAIStatus('listening'); // Start in listening mode — audio chunks blocked until setupComplete

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
              tools: [{
                functionDeclarations: [{
                  name: "generate_feedback",
                  description: "Call this tool ONLY when the user says the interview is over. It submits the final evaluation.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      score: { type: "INTEGER", description: "Score from 0 to 100" },
                      feedback: { type: "STRING", description: "General summary paragraph of performance" },
                      strengths: { type: "ARRAY", items: { type: "STRING" }, description: "List of candidate's strengths" },
                      improvements: { type: "ARRAY", items: { type: "STRING" }, description: "List of areas to improve" }
                    },
                    required: ["score", "feedback", "strengths", "improvements"]
                  }
                }]
              }]
            },
          };
          ws.send(JSON.stringify(setup));
          resolve();
        };

        ws.onmessage = async (event) => {
          console.log('[GeminiLive] ws.onmessage type:', typeof event.data, event.data instanceof Blob ? 'Blob' : '');
          let data: Record<string, unknown>;
          try {
            if (event.data instanceof Blob) {
              const text = await event.data.text();
              console.log('[GeminiLive] ws.onmessage blob text length:', text.length);
              data = JSON.parse(text);
            } else {
              data = JSON.parse(event.data as string);
            }
          } catch (e) {
            console.log('[GeminiLive] ws.onmessage parse error:', e);
            return;
          }
          handleMessage(data);
        };

        ws.onerror = (e) => {
          console.log('[GeminiLive] ws.onerror', e);
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
          const closeStage = !isOpened
            ? 'before-open'
            : !setupReadyRef.current
            ? 'before-setup-complete'
            : firstAudioSentRef.current
            ? 'after-first-audio'
            : 'before-first-audio';
          console.log('[GeminiLive] ws.onclose code:', event.code, 'reason:', event.reason, 'stage:', closeStage, 'url:', urlSafe, 'model:', model);
          setIsConnected(false);
          setAIStatus('idle');
          if (wsRef.current === ws) wsRef.current = null;
          
          if (!isOpened) {
            reject(new Error(`Connection closed before opening. Code: ${event.code}. Reason: ${event.reason} | URL: ${urlSafe} | model: ${model}`));
          } else if (event.code !== 1000 && event.code !== 1005) {
            if (event.code === 1008 && closeStage === 'after-first-audio') {
              callbacksRef.current.onError(
                `The Live API rejected the first live input after setup. Code: ${event.code}. Reason: ${event.reason || 'No reason provided'}. Capture and turn-timing details are logged.`
              );
            } else {
              callbacksRef.current.onError(`Connection lost. Code: ${event.code}. Reason: ${event.reason}. Stage: ${closeStage}`);
            }
          }
        };
      });
    },
    [handleMessage],
  );

  const sendAudioChunk = useCallback((base64PCM: string) => {
    if (!setupReadyRef.current) {
      return; // Discard chunks until setupComplete is received — prevents competing with "Hello." trigger
    }
    if (Date.now() < audioEnabledAtRef.current) {
      return; // Briefly avoid racing setup/the initial AI trigger, but never block mic indefinitely.
    }
    if (!wsRef.current) {
      console.log('[GeminiLive] sendAudioChunk early return: wsRef is null');
      return;
    }
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('[GeminiLive] sendAudioChunk early return: ws not OPEN, state:', wsRef.current.readyState);
      return;
    }
    const msg = {
      realtimeInput: {
        audio: {
          data: base64PCM,
          mimeType: `audio/pcm;rate=${GEMINI_CONFIG.inputSampleRate}`,
        },
      },
    };
    const isFirstAudio = !firstAudioSentRef.current;
    firstAudioSentRef.current = true;
    console.log('[GeminiLive] sendAudioChunk, ws state:', wsRef.current.readyState, 'chunk size:', base64PCM.length, 'firstAudio:', isFirstAudio);
    wsRef.current.send(JSON.stringify(msg));
  }, []);

  const sendClientText = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    }));
  }, []);

  const disconnect = useCallback(() => {
    setupReadyRef.current = false;
    audioEnabledAtRef.current = 0;
    firstAudioSentRef.current = false;
    toolCallInProgressRef.current = false;
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    setAIStatus('idle');
  }, []);

  return { aiStatus, isConnected, connect, sendAudioChunk, sendClientText, disconnect };
}
