/**
 * useConnieTurnBased.ts
 * Chapter-aware Connie voice — calls Gemini directly.
 * No Supabase edge function. Fast, simple, works on Cloud Run.
 *
 * Reads GEMINI_API_KEY from AI Studio Secrets (injected at runtime).
 */
import { useState, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function getApiKey(): string {
  return (process.env as any).GEMINI_API_KEY
    || (process.env as any).API_KEY
    || (window as any).GEMINI_API_KEY
    || (window as any).API_KEY
    || (globalThis as any).GEMINI_API_KEY
    || '';
}

// ─── Chapter guidance ─────────────────────────────────────────────────────────
export const CHAPTER_GUIDANCE: Record<string, { focus: string; openingQuestion: string }> = {
  childhood: {
    focus: 'Focus on early memories, childhood home, family dynamics, neighborhood, school days, and formative moments from their earliest years.',
    openingQuestion: 'Tell me — what is your very first memory of them as a child? Close your eyes for a moment. What do you see?',
  },
  coming_of_age: {
    focus: 'Explore teenage years, first loves, dreams and ambitions, identity formation, friendships, and the moments that shaped who they became.',
    openingQuestion: 'What was it like for them growing up — those years of figuring out who they were and what they wanted from life?',
  },
  mid_life: {
    focus: 'Dig into career and purpose, what they built professionally, their proudest achievements, struggles they overcame, and what drove them during their working years.',
    openingQuestion: 'Tell me about what they poured themselves into during their working years. What were they most proud of?',
  },
  love_family: {
    focus: 'Draw out stories about romantic love, marriage, parenting, grandparenting, close friendships, and how they showed love to the people around them.',
    openingQuestion: 'Who were the great loves of their life? Tell me about the relationships that mattered most to them.',
  },
  legacy: {
    focus: 'Explore their wisdom, life philosophy, the lessons they passed down, what they would want to be remembered for, and the marks they left on the world.',
    openingQuestion: 'When you think about what they left behind — not just things, but wisdom, spirit, impact — what comes to mind?',
  },
};

export interface ConnieTurnConfig {
  subject: string;
  storytellerName?: string;
  existingTranscript?: string;
  chapterContext?: string;
  language?: string;
}

export interface ConnieTurnMessage {
  role: 'user' | 'connie';
  text: string;
}

// ─── PCM base64 → WAV blob URL ────────────────────────────────────────────────
function pcmToWav(base64pcm: string, sampleRate = 24000): string {
  const raw = atob(base64pcm);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const h = new ArrayBuffer(44);
  const v = new DataView(h);
  const s = (o: number, str: string) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  s(0,'RIFF'); v.setUint32(4,36+bytes.length,true);
  s(8,'WAVE'); s(12,'fmt ');
  v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
  v.setUint32(24,sampleRate,true); v.setUint32(28,sampleRate*2,true);
  v.setUint16(32,2,true); v.setUint16(34,16,true); s(36,'data');
  v.setUint32(40,bytes.length,true);
  const wav = new Uint8Array(44+bytes.length);
  wav.set(new Uint8Array(h)); wav.set(bytes,44);
  return URL.createObjectURL(new Blob([wav],{type:'audio/wav'}));
}

// ─── Build system prompt ──────────────────────────────────────────────────────
function buildSystemPrompt(config: ConnieTurnConfig): string {
  const subject = config.subject || 'your loved one';
  const teller = config.storytellerName || 'friend';
  const lang = config.language || 'English';
  const chapterGuidance = config.chapterContext && CHAPTER_GUIDANCE[config.chapterContext];
  const chapterBlock = chapterGuidance
    ? `\nACTIVE CHAPTER — "${config.chapterContext!.replace(/_/g,' ').toUpperCase()}":
${chapterGuidance.focus}
Open with: "${chapterGuidance.openingQuestion}"
Stay focused on this chapter. If the storyteller drifts, gently guide back.\n`
    : '';

  return `You are Connie — a warm, unhurried, deeply compassionate AI companion helping preserve the life story of ${subject}.
You are speaking with ${teller}. Respond only in ${lang}.
YOUR PERSONALITY: Warm, caring, genuinely curious. Never clinical or robotic.
Use ${subject}'s name often. Reflect back what you hear before moving on.
Affirmations feel natural: "Mmm.", "I love that.", "Tell me more about that."
${chapterBlock}
RULES:
- Ask ONE question at a time. Always.
- Reflect briefly after each answer before asking the next.
- After 5+ substantive exchanges, offer to weave the story. If agreed, call create_story.
- If they mention photos, call request_photos.
- If they need to stop, call save_progress.
- Never break character. Never mention AI or Gemini. You are simply Connie.
- Never invent facts.
- Use these as inspiration for your questions:
  * "Tell me about the house you grew up in."
  * "Who was the 'character' in your family?"
  * "What was happening in the world when you were 18?"
  * "Tell me about your first job or first car."
  * "How did you meet your spouse?"
  * "What was the biggest change you lived through?"
  * "What advice would you give your younger self?"
  * "What are you most grateful for?"
${config.existingTranscript ? `\nPREVIOUS CONTEXT:\n${config.existingTranscript}` : ''}`;
}

// ─── Transcribe audio blob via Gemini ────────────────────────────────────────
async function transcribeAudioDirect(blob: Blob): Promise<string> {
  const key = getApiKey();
  const ai = new GoogleGenAI({ apiKey: key });
  const buf = await blob.arrayBuffer();
  // Safe base64 conversion — spread operator overflows call stack on large audio
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64Audio = btoa(binary);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{
      parts: [
        { inlineData: { mimeType: blob.type || 'audio/webm', data: base64Audio } },
        { text: 'Transcribe this audio accurately. Return only the transcription, nothing else.' }
      ]
    }]
  });

  return response.text?.trim() || '';
}

// ─── Get Connie's text response via Gemini ────────────────────────────────────
async function getConnieResponseDirect(
  systemPrompt: string,
  history: { role: string; parts: { text: string }[] }[]
): Promise<{ text: string; functionCall?: { name: string; args: any } }> {
  const key = getApiKey();
  const ai = new GoogleGenAI({ apiKey: key });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: history,
    config: {
      systemInstruction: systemPrompt,
      tools: [{
        functionDeclarations: [
          {
            name: 'request_photos',
            description: 'Ask the user to upload photos.',
            parameters: { type: 'OBJECT', properties: { reason: { type: 'STRING' } }, required: ['reason'] }
          },
          {
            name: 'create_story',
            description: 'Signal ready to weave the story after 5+ substantive exchanges.',
            parameters: { type: 'OBJECT', properties: { subject_name: { type: 'STRING' }, confidence: { type: 'STRING' } }, required: ['subject_name'] }
          },
          {
            name: 'save_progress',
            description: 'Save conversation so user can return later.',
            parameters: { type: 'OBJECT', properties: { summary: { type: 'STRING' } }, required: ['summary'] }
          }
        ]
      }],
      temperature: 0.8,
      maxOutputTokens: 300
    }
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  const textPart = parts.find((p: any) => p.text);
  const fnPart = response.functionCalls?.[0];

  return {
    text: textPart?.text?.trim() || "Tell me more — what do you remember most vividly?",
    functionCall: fnPart ? { name: fnPart.name, args: fnPart.args } : undefined,
  };
}

// ─── TTS via Gemini ───────────────────────────────────────────────────────────
async function speakTextDirect(text: string): Promise<string | null> {
  const key = getApiKey();
  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TTS timeout')), 15000)
      ),
    ]) as any;
    const pcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return pcm ? pcmToWav(pcm) : null;
  } catch (err) {
    console.warn('[TTS] failed or timed out — text already shown:', err);
    return null;
  }
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useConnieTurnBased(config: ConnieTurnConfig) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnieSpeaking, setIsConnieSpeaking] = useState(false);
  const [messages, setMessages] = useState<ConnieTurnMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<{ role: string; parts: { text: string }[] }[]>([]);
  const systemPrompt = useMemo(() => buildSystemPrompt(config), [
    config.subject, config.storytellerName, config.chapterContext,
    config.existingTranscript, config.language
  ]);

  const getTranscript = useCallback(() =>
    messages.filter(m => m.role === 'user').map(m => m.text).join('\n\n'),
  [messages]);

  const playAudio = useCallback((url: string): Promise<void> => new Promise(resolve => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsConnieSpeaking(true);
    const audio = new Audio(url);
    audioRef.current = audio;
    const done = () => { setIsConnieSpeaking(false); resolve(); };
    audio.onended = done;
    audio.onerror = done;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => audio.play().catch(done));
      } else {
        audio.play().catch(done);
      }
    } catch {
      audio.play().catch(done);
    }
  }), []);

  const processTurn = useCallback(async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const userText = await Promise.race([
        transcribeAudioDirect(blob),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Transcription timed out')), 20000)
        ),
      ]);
      if (!userText.trim()) return;

      setMessages(prev => [...prev, { role: 'user', text: userText }]);
      historyRef.current.push({ role: 'user', parts: [{ text: userText }] });

      const { text: connieText, functionCall } = await getConnieResponseDirect(systemPrompt, historyRef.current);
      historyRef.current.push({ role: 'model', parts: [{ text: connieText }] });
      // Show text immediately — don't wait for TTS
      setMessages(prev => [...prev, { role: 'connie', text: connieText }]);

      if (functionCall) {
        window.dispatchEvent(new CustomEvent('connie-action', {
          detail: { name: functionCall.name, args: functionCall.args }
        }));
      }

      const audioUrl = await speakTextDirect(connieText);
      if (audioUrl) await playAudio(audioUrl);

    } catch (err: any) {
      console.error('[Connie] Turn failed:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [systemPrompt, playAudio]);

  const startRecording = useCallback(async () => {
    setError(null);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setIsConnieSpeaking(false); }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        await processTurn(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      setError('Microphone access denied. Please allow microphone access and try again.');
    }
  }, [processTurn]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsConnieSpeaking(false);
  }, []);

  const initConversation = useCallback(async () => {
    if (messages.length > 0) return;
    setIsProcessing(true);
    try {
      const chapterGuidance = config.chapterContext && CHAPTER_GUIDANCE[config.chapterContext];
      const openingPrompt = chapterGuidance
        ? `Greet ${config.storytellerName || 'the user'} warmly, introduce yourself as Connie, then ask exactly: "${chapterGuidance.openingQuestion}"`
        : `Introduce yourself warmly as Connie and ask the first gentle question to begin preserving ${config.subject}'s story.`;

      historyRef.current.push({ role: 'user', parts: [{ text: openingPrompt }] });
      const { text: greeting } = await getConnieResponseDirect(systemPrompt, historyRef.current);
      historyRef.current.push({ role: 'model', parts: [{ text: greeting }] });
      setMessages([{ role: 'connie', text: greeting }]);

      const audioUrl = await speakTextDirect(greeting);
      if (audioUrl) await playAudio(audioUrl);

    } catch (err: any) {
      console.error('[Connie] Init failed:', err);
      setError(err.message || 'Could not connect to Connie.');
    } finally {
      setIsProcessing(false);
    }
  }, [config.subject, config.storytellerName, config.chapterContext, systemPrompt, playAudio, messages.length]);

  // ── Inject external context (scan result, photo analysis) into conversation ──
  const injectContext = useCallback(async (contextText: string) => {
    if (!contextText.trim()) return;
    const userMsg = `[Artifact context]: ${contextText}`;
    setMessages(prev => [...prev, { role: 'user', text: contextText }]);
    historyRef.current.push({ role: 'user', parts: [{ text: userMsg }] });
    setIsProcessing(true);
    try {
      // Use the already-built systemPrompt from hook scope
      const { text: connieText, functionCall } = await getConnieResponseDirect(systemPrompt, historyRef.current);
      historyRef.current.push({ role: 'model', parts: [{ text: connieText }] });
      setMessages(prev => [...prev, { role: 'connie', text: connieText }]);
      if (functionCall) {
        window.dispatchEvent(new CustomEvent('connie-action', { detail: { name: functionCall.name, args: functionCall.args } }));
      }
      const audioUrl = await speakTextDirect(connieText);
      if (audioUrl) await playAudio(audioUrl);
    } catch (err: any) {
      console.error('[Connie] injectContext failed:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [systemPrompt, playAudio]);

  return {
    isRecording,
    isProcessing,
    isConnieSpeaking,
    messages,
    error,
    startRecording,
    stopRecording,
    stopSpeaking,
    getTranscript,
    initConversation,
    injectContext,
  };
}
