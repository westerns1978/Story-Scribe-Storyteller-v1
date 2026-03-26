// hooks/useGeminiLive.ts
// ============================================
// Connie Live Voice — Ephemeral Token Edition
// ============================================
// FIXED: No longer uses process.env.API_KEY or hardcoded keys.
// All voice connections go through Supabase get_token action which:
//   1. Creates ephemeral token via v1alpha endpoint (correct)
//   2. Returns pre-built ws_url with correct Constrained endpoint
//   3. Frontend uses ws_url directly — no URL construction
// ============================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { FunctionDeclaration, Type } from '@google/genai';

// ─── Supabase edge function config ───────────────────────────────────────────

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';
const CASCADE_URL = `${SUPABASE_URL}/functions/v1/story-cascade`;

async function fetchEphemeralToken(subjectName: string): Promise<{
  token: string;
  ws_url: string;
  model: string;
}> {
  const res = await fetch(CASCADE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: 'get_token',
      subject_name: subjectName,
      voice_name: 'Kore',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`get_token failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  if (!data.ws_url) throw new Error('get_token did not return ws_url');
  return data;
}

// ─── Audio helpers ────────────────────────────────────────────────────────────

function encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function decodeAudioChunk(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate = 24000,
  channels = 1,
): Promise<AudioBuffer> {
  const int16 = new Int16Array(data.buffer);
  const frameCount = int16.length / channels;
  const buf = ctx.createBuffer(channels, frameCount, sampleRate);
  for (let c = 0; c < channels; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < frameCount; i++) ch[i] = int16[i * channels + c] / 32768.0;
  }
  return buf;
}

// ─── Function declarations Connie can call ───────────────────────────────────

const navigateToDecl: FunctionDeclaration = {
  name: 'navigateTo',
  parameters: {
    type: Type.OBJECT,
    description: 'Navigate to a view in the Story Scribe app.',
    properties: { view: { type: Type.STRING, description: 'View name to navigate to.' } },
    required: ['view'],
  },
};

const createStoryDecl: FunctionDeclaration = {
  name: 'createFinalStory',
  parameters: {
    type: Type.OBJECT,
    description: 'Signal that Connie has gathered enough to create the story. Call after 5+ meaningful exchanges.',
    properties: {
      subject_name: { type: Type.STRING, description: 'The name of the person being remembered.' },
      confidence: { type: Type.STRING, description: 'How confident Connie is: high/medium/low' },
    },
    required: ['subject_name'],
  },
};

const requestPhotosDecl: FunctionDeclaration = {
  name: 'requestPhotos',
  parameters: {
    type: Type.OBJECT,
    description: 'Ask the user to upload photos or documents.',
    properties: { reason: { type: Type.STRING, description: 'Why photos would help the story.' } },
    required: ['reason'],
  },
};

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(config: ConnieSessionConfig): string {
  const subjectName = config.subjectName || 'their loved one';
  const storytellerName = config.storytellerName || 'the family';
  const resume = config.resumeContext ? `\n\nPREVIOUS CONTEXT:\n${config.resumeContext}` : '';

  return `You are Connie — a warm, unhurried, deeply compassionate AI companion whose sole purpose is to help preserve the life story of ${subjectName}.

You are speaking with ${storytellerName}. Your voice is gentle, your pace is slow, your questions are specific and unexpected.

APPROACH:
- Ask ONE question at a time. Never rush.
- Hunt for sensory details: sounds, smells, textures, specific moments.
- When they share something meaningful, acknowledge it before moving forward.
- "Tell me more about that" is always better than the next question.
- Find the details that make this person irreplaceable — the worn-through shoes, the rose garden, the specific laugh.

OPENING: "Hello, ${storytellerName}. I'm so glad you're here. I'm Connie, and I'm honored to help preserve ${subjectName}'s story. Tell me — who is ${subjectName} to you?"

TOOLS:
- Use navigateTo to move the user to different app sections when helpful.
- Use requestPhotos when photos would meaningfully enrich the story.
- Use createFinalStory only after 5+ meaningful exchanges AND with the family's confirmation.

RULES:
- Never mention AI, Gemini, or models. You are simply Connie.
- Never invent facts. Only use what the family shares.
- If asked about yourself, say only: "I'm Connie — I'm here to listen."${resume}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConnieSessionConfig {
  subjectName?: string;
  storytellerName?: string;
  resumeContext?: string;
  chapterContext?: string;
}

export interface ConnieLiveMessage {
  role: 'user' | 'connie' | 'model';
  text: string;
  timestamp?: number;
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useGeminiLive(config: ConnieSessionConfig) {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnieSpeaking, setIsConnieSpeaking] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [messages, setMessages] = useState<ConnieLiveMessage[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const isConnectingRef = useRef(false); // storm guard
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Connect ────────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (isConnectingRef.current || isListening) return;
    isConnectingRef.current = true;
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Get ephemeral token + ws_url from Supabase edge function
      const subjectName = config.subjectName || 'their loved one';
      console.log('[Connie] Fetching ephemeral token for:', subjectName);
      const { ws_url, model } = await fetchEphemeralToken(subjectName);
      console.log('[Connie] Token received — connecting via v1alpha WebSocket');

      // Set up audio contexts
      inputCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // Connect to Gemini Live via pre-built ws_url
      const ws = new WebSocket(ws_url);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send setup message as first message
        ws.send(JSON.stringify({
          setup: {
            model,
            generation_config: {
              response_modalities: ['AUDIO'],
              speech_config: {
                voice_config: { prebuilt_voice_config: { voice_name: 'Kore' } },
              },
            },
            system_instruction: {
              parts: [{ text: buildSystemPrompt(config) }],
            },
            tools: [{ function_declarations: [navigateToDecl, createStoryDecl, requestPhotosDecl] }],
            input_audio_transcription: {},
            output_audio_transcription: {},
          },
        }));

        setIsListening(true);
        setIsConnecting(false);
        isConnectingRef.current = false;
        console.log('[Connie] Live session open ✓');

        // Start microphone
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          mediaStreamRef.current = stream;
          const source = inputCtxRef.current!.createMediaStreamSource(stream);
          const processor = inputCtxRef.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
            ws.send(JSON.stringify({
              realtime_input: {
                media_chunks: [{
                  data: encode(new Uint8Array(int16.buffer)),
                  mime_type: 'audio/pcm;rate=16000',
                }],
              },
            }));
          };

          source.connect(processor);
          processor.connect(inputCtxRef.current!.destination);
          console.log('[Connie] Audio streaming started ✓');
        }).catch(err => {
          console.error('[Connie] Microphone access failed:', err);
          setConnectionError('Microphone access denied.');
        });
      };

      ws.onmessage = async (event) => {
        let msg: any;
        try {
          msg = JSON.parse(event.data instanceof Blob ? await event.data.text() : event.data);
        } catch { return; }

        // Tool calls
        if (msg.toolCall) {
          for (const fc of msg.toolCall.functionCalls || []) {
            console.log('[Connie] Tool call:', fc.name, fc.args);
            // Dispatch to UI via custom events — ConnieFullScreen listens
            window.dispatchEvent(new CustomEvent('connie-tool-call', {
              detail: { name: fc.name, args: fc.args },
            }));
            if (fc.name === 'createFinalStory') {
              window.dispatchEvent(new CustomEvent('connie-trigger-create', {
                detail: fc.args,
              }));
            }
            if (fc.name === 'requestPhotos') {
              window.dispatchEvent(new CustomEvent('connie-request-photos', {
                detail: fc.args,
              }));
            }
            // Send tool response
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                tool_response: {
                  function_responses: [{
                    id: fc.id,
                    name: fc.name,
                    response: { result: 'Success' },
                  }],
                },
              }));
            }
          }
        }

        // Audio output
        const audioPart = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioPart && outputCtxRef.current) {
          try {
            const audioBuffer = await decodeAudioChunk(decode(audioPart), outputCtxRef.current);
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtxRef.current.currentTime);
            const source = outputCtxRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtxRef.current.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);

            setIsConnieSpeaking(true);
            if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = setTimeout(
              () => setIsConnieSpeaking(false),
              audioBuffer.duration * 1000 + 300,
            );
          } catch (e) {
            console.error('[Connie] Audio decode error:', e);
          }
        }

        // Transcriptions
        if (msg.serverContent?.inputTranscription?.text) {
          setMessages(prev => [...prev, {
            role: 'user',
            text: msg.serverContent.inputTranscription.text,
            timestamp: Date.now(),
          }]);
        }
        if (msg.serverContent?.outputTranscription?.text) {
          setMessages(prev => [...prev, {
            role: 'connie',
            text: msg.serverContent.outputTranscription.text,
            timestamp: Date.now(),
          }]);
        }
      };

      ws.onerror = (e) => {
        console.error('[Connie] WebSocket error:', e);
        setConnectionError('Connection error — please try again.');
        isConnectingRef.current = false;
        setIsConnecting(false);
      };

      ws.onclose = (e) => {
        console.log('[Connie] WebSocket closed:', e.code, e.reason);
        setIsListening(false);
        setIsConnecting(false);
        setIsConnieSpeaking(false);
        isConnectingRef.current = false;
      };

    } catch (err: any) {
      console.error('[Connie] connect() failed:', err);
      setConnectionError(err.message || 'Failed to connect to Connie.');
      setIsConnecting(false);
      isConnectingRef.current = false;
    }
  }, [config]);

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (isConnectingRef.current) return;

    scriptProcessorRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    if (inputCtxRef.current?.state !== 'closed') inputCtxRef.current?.close();
    for (const src of audioSourcesRef.current) { try { src.stop(); } catch { /* ignore */ } }
    audioSourcesRef.current.clear();
    if (outputCtxRef.current?.state !== 'closed') outputCtxRef.current?.close();
    if (wsRef.current) { try { wsRef.current.close(); } catch { /* ignore */ } wsRef.current = null; }
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);

    nextStartTimeRef.current = 0;
    setIsListening(false);
    setIsConnecting(false);
    setIsConnieSpeaking(false);
  }, []);

  // ── Send image to Connie ───────────────────────────────────────────────────
  const sendImage = useCallback((base64: string, mimeType = 'image/jpeg') => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      realtime_input: {
        media_chunks: [{ data: base64, mime_type: mimeType }],
      },
    }));
  }, []);

  // ── Camera ─────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async (ref: React.RefObject<HTMLVideoElement>) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (ref.current) { ref.current.srcObject = stream; await ref.current.play(); }
      videoRef.current = ref.current;
      setIsVideoActive(true);

      // Send frames to Connie every 4s while connected
      frameIntervalRef.current = setInterval(() => {
        if (!ref.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
        const canvas = document.createElement('canvas');
        canvas.width = ref.current.videoWidth;
        canvas.height = ref.current.videoHeight;
        canvas.getContext('2d')?.drawImage(ref.current, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        sendImage(base64);
      }, 4000);
    } catch (err) {
      console.error('[Connie] Camera error:', err);
    }
  }, [sendImage]);

  const stopCamera = useCallback(() => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsVideoActive(false);
  }, []);

  // ── Get transcript ─────────────────────────────────────────────────────────
  const getTranscript = useCallback(() => {
    return messages
      .map(m => `${m.role === 'user' ? 'Storyteller' : 'Connie'}: ${m.text}`)
      .join('\n');
  }, [messages]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendImage,
    startCamera,
    stopCamera,
    getTranscript,
    isListening,
    isConnecting,
    isVideoActive,
    isConnieSpeaking,
    messages,
    connectionError,
  };
}
