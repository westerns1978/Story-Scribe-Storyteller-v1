import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob, FunctionDeclaration, Type } from '@google/genai';

const STORY_CASCADE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co/functions/v1/story-cascade';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';

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

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + ch] / 32768.0;
  }
  return buffer;
}

// ─── Function declarations (Connie controls the UI) ───────────────────────────
const request_photos: FunctionDeclaration = {
  name: 'request_photos',
  description: 'Ask the user to upload photos of the person being remembered. Call this when photos would enrich the story — after learning about their appearance, home, or key life moments.',
  parameters: { type: Type.OBJECT, properties: { reason: { type: Type.STRING, description: 'Brief reason why photos would help right now' } }, required: ['reason'] },
};

const create_story: FunctionDeclaration = {
  name: 'create_story',
  description: 'Signal that you have gathered enough memories and are ready to weave the story. Only call this after at least 5 substantive exchanges covering childhood, family, work, and personal character. Never call this prematurely.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      subject_name: { type: Type.STRING, description: 'The full name of the person whose story is being preserved' },
      confidence: { type: Type.STRING, enum: ['ready', 'could_use_more'], description: 'Whether you feel you have enough to create a rich story' },
    },
    required: ['subject_name'],
  },
};

const save_progress: FunctionDeclaration = {
  name: 'save_progress',
  description: 'Save the conversation so far so the user can return later and continue. Call this if the user says they need to stop, take a break, or come back later.',
  parameters: { type: Type.OBJECT, properties: { summary: { type: Type.STRING, description: 'A 1-2 sentence summary of what has been shared so far' } }, required: ['summary'] },
};

const navigate: FunctionDeclaration = {
  name: 'navigate',
  description: 'Navigate the app to a different screen.',
  parameters: { type: Type.OBJECT, properties: { destination: { type: Type.STRING } }, required: ['destination'] },
};

// ─── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(config: ConnieSessionConfig): string {
  const subjectName = config.subjectName || 'your loved one';
  const storytellerName = config.storytellerName || 'friend';
  const language = config.language || 'English';
  const resumeContext = config.resumeContext || '';

  return `You are Connie — a warm, unhurried, deeply compassionate AI companion whose sole purpose is to help preserve the life story of ${subjectName}.

You are speaking with ${storytellerName}. Respond only in ${language}.

YOUR PERSONALITY:
- You are like the wisest, warmest friend the family has — someone who genuinely cares, listens without rushing, and asks the questions no one else thinks to ask.
- You speak gently, warmly, and with genuine curiosity. Never clinical. Never robotic. Never in lists.
- You use the person's name (${subjectName}) naturally and often.
- You reflect back what you hear before moving forward: "That's beautiful — so ${subjectName} was the kind of person who..." 
- Short pauses and affirmations feel natural: "Mmm.", "I love that.", "Tell me more about that."
- You have infinite patience. Never rush. Never move on too quickly.

YOUR INTERVIEW STRUCTURE — follow this arc, but naturally, not mechanically:
1. OPEN WARMLY: "Hello, ${storytellerName}. I'm so glad you're here. I'm Connie, and I'm honored to help you preserve ${subjectName}'s story. Before we begin — how are you feeling today?" Listen. Acknowledge. Then: "Tell me — who is ${subjectName} to you?"
2. EARLY LIFE: Childhood home, earliest memory, parents, siblings, neighborhood, school days.
3. FORMATIVE MOMENTS: A challenge they overcame. Something that shaped who they became. A turning point.
4. LOVE & FAMILY: How they met their partner (if applicable). What kind of parent/grandparent they were. How they showed love.
5. WORK & PURPOSE: What they did. What they were proud of. What they built.
6. CHARACTER & SPIRIT: What made them laugh. What they believed in. How others would describe them. A story that captures who they truly were.
7. LEGACY: What they would want to be remembered for. A message they'd want to leave behind.

RULES:
- Ask ONE question at a time. Always. Never stack questions.
- After each answer, reflect briefly before asking the next question.
- When the moment feels right (after covering at least 5 of the 7 areas above), gently offer: "I feel like I'm beginning to truly know ${subjectName}. I think we have something beautiful to work with. Would you like me to begin weaving the story now? We can always add more later." If they say yes, call create_story.
- If they seem to have lots of photos, say: "It sounds like you have some wonderful photos of ${subjectName}. Would you like to share a few? They'll help bring the story to life." Then call request_photos.
- If they need to stop, call save_progress and say: "Your memories are safe. Come back whenever you're ready — I'll be right here."
- Never break character. Never mention AI, Gemini, or models. You are simply Connie.
- Never make up facts about ${subjectName}. Only use what the storyteller shares.

${resumeContext ? `PREVIOUS SESSION CONTEXT — you already know the following about ${subjectName}. Acknowledge it warmly and continue from where you left off:\n${resumeContext}` : ''}

Begin the conversation now with your warm opening.`;
}

export interface ConnieSessionConfig {
  storytellerName?: string;
  subjectName?: string;
  language?: string;
  resumeContext?: string; // Summary from a previous session
}

export function useGeminiLive(config: ConnieSessionConfig) {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnieSpeaking, setIsConnieSpeaking] = useState(false);

  const sessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = async () => {
    setConnectionError(null);
    setIsConnecting(true);

    try {
      // Use the AI Studio API key directly — ephemeral token endpoint is not yet GA
      const apiKey = process.env.API_KEY || (window as any).GEMINI_API_KEY || 'AIzaSyDUfGlQmbB9QaRlDtYENAqtSTyDQVD7avs';
      if (!apiKey) throw new Error('No API key available. Please ensure an API key is configured.');
      console.log('[Connie] Connecting with API key ✓');

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const outputNode = outputAudioContextRef.current.createGain();
      outputNode.connect(outputAudioContextRef.current.destination);
      outputNodeRef.current = outputNode;
      nextStartTimeRef.current = 0;

      // Use the real WebSocket — Supabase interceptor wraps window.WebSocket
      // and redirects ALL WebSocket connections through /api-proxy/ which breaks Gemini Live
      const realWS = (window as any).__RealWebSocket || WebSocket;
      const origWS = window.WebSocket;
      window.WebSocket = realWS;

      const ai = new GoogleGenAI({ apiKey });

      const session = await ai.live.connect({
        model: 'gemini-live-2.5-flash-native-audio',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: buildSystemPrompt(config),
          tools: [{ functionDeclarations: [request_photos, create_story, save_progress, navigate] }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Warm feminine voice
            },
          },
        },
        callbacks: {
          onopen: async () => {
            console.log('[Connie] Live session open ✓');
            setIsConnecting(false);
            setIsListening(true);

            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              mediaStreamRef.current = stream;

              const inputCtx = inputAudioContextRef.current!;
              if (inputCtx.state === 'suspended') await inputCtx.resume();

              const source = inputCtx.createMediaStreamSource(stream);
              const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
              scriptProcessorRef.current = scriptProcessor;

              scriptProcessor.onaudioprocess = (event) => {
                if (!sessionRef.current) return;
                const inputData = event.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  int16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                }
                try {
                  const pcmBlob: GenAIBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
                  sessionRef.current.sendRealtimeInput({ media: pcmBlob });
                } catch (e) { /* session may have closed */ }
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(inputCtx.destination);
              console.log('[Connie] Audio streaming started ✓');
            } catch (err) {
              console.error('[Connie] Audio setup failed:', err);
              setConnectionError('Microphone access denied or audio setup failed.');
              setIsListening(false);
            }
          },

          onmessage: async (message: LiveServerMessage) => {
            // ── Function calls from Connie ──────────────────────────────────
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                console.log('[Connie] Tool call:', fc.name, fc.args);
                // Dispatch to UI — ConnieFullScreen listens for these
                window.dispatchEvent(new CustomEvent('connie-action', {
                  detail: { name: fc.name, args: fc.args }
                }));
                sessionRef.current?.sendToolResponse({
                  functionResponses: [{ id: fc.id, name: fc.name, response: { result: 'Success' } }],
                });
              }
            }

            // ── Audio output ────────────────────────────────────────────────
            const audioPart = message.serverContent?.modelTurn?.parts?.find(
              (p: any) => p.inlineData?.mimeType?.startsWith('audio/')
            );
            if (audioPart?.inlineData?.data && outputAudioContextRef.current && outputNodeRef.current) {
              try {
                const ctx = outputAudioContextRef.current;
                if (ctx.state === 'suspended') await ctx.resume();
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const pcmBytes = decode(audioPart.inlineData.data);
                const audioBuffer = await decodeAudioData(pcmBytes, ctx, 24000, 1);
                const src = ctx.createBufferSource();
                src.buffer = audioBuffer;
                src.connect(outputNodeRef.current);
                src.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;

                // Track speaking state for waveform animation
                setIsConnieSpeaking(true);
                if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
                speakingTimeoutRef.current = setTimeout(() => setIsConnieSpeaking(false), audioBuffer.duration * 1000 + 300);
              } catch (e) {
                console.error('[Connie] Audio decode error:', e);
              }
            }

            // ── Transcriptions ──────────────────────────────────────────────
            const inputText = message.serverContent?.inputTranscription?.text;
            if (inputText?.trim()) setMessages(prev => [...prev, { role: 'user', text: inputText }]);
            const outputText = message.serverContent?.outputTranscription?.text;
            if (outputText?.trim()) setMessages(prev => [...prev, { role: 'model', text: outputText }]);
          },

          onclose: () => { setIsListening(false); setIsConnecting(false); setIsConnieSpeaking(false); },
          onerror: (e: any) => {
            console.error('[Connie] Error:', e);
            setConnectionError('Connection lost. Tap the mic to reconnect.');
            setIsListening(false);
            setIsConnecting(false);
            setIsConnieSpeaking(false);
          },
        },
      });

      sessionRef.current = session;
      // Restore Supabase's WebSocket wrapper after Gemini session is established
      window.WebSocket = origWS;

    } catch (err: any) {
      console.error('[Connie] connect() failed:', err);
      setConnectionError(err.message || 'Failed to connect to Connie.');
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    setIsListening(false);
    setIsConnecting(false);
    setIsConnieSpeaking(false);
    stopVideo();
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    // Stop audio first to prevent "already closing" errors
    try { scriptProcessorRef.current?.disconnect(); } catch {}
    scriptProcessorRef.current = null;
    try { mediaStreamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    mediaStreamRef.current = null;
    try { sessionRef.current?.close(); } catch {}
    sessionRef.current = null;
    nextStartTimeRef.current = 0;
    // Close audio contexts last
    try { await inputAudioContextRef.current?.close(); } catch {}
    inputAudioContextRef.current = null;
    try { await outputAudioContextRef.current?.close(); } catch {}
    outputAudioContextRef.current = null;
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setIsVideoActive(true);
      frameIntervalRef.current = window.setInterval(() => {
        if (canvasRef.current && videoRef.current && sessionRef.current) {
          const canvas = canvasRef.current;
          canvas.width = 640; canvas.height = 480;
          canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0, 640, 480);
          const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
          sessionRef.current.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64 } });
        }
      }, 1000);
    } catch (err) { console.error('[Connie] Camera error:', err); }
  };

  const stopVideo = () => {
    if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsVideoActive(false);
  };

  const getTranscript = useCallback(() =>
    messages.map(m => `${m.role === 'user' ? 'Storyteller' : 'Connie'}: ${m.text}`).join('\n'),
    [messages]
  );

  return {
    connect, disconnect,
    isListening, isConnecting, isVideoActive, isConnieSpeaking,
    messages, connectionError,
    startVideo, stopVideo,
    videoRef, canvasRef,
    getTranscript,
  };
}
