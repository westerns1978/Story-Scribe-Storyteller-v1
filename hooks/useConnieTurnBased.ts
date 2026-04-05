/**
 * useConnieTurnBased.ts
 * Chapter-aware Connie voice — routes through Supabase edge functions.
 * transcribe_audio, connie_chat, and narrate all go through story-cascade.
 * No API keys in the browser.
 */
import { useState, useRef, useCallback, useMemo } from 'react';

// ─── Supabase edge function config ─────────────────────────────────────────────
const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';
const CASCADE_URL = `${SUPABASE_URL}/functions/v1/story-cascade`;

async function cascadeCall(action: string, params: Record<string, any>): Promise<any> {
  const res = await fetch(CASCADE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) throw new Error(`cascade ${action} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// ─── Chapter guidance ─────────────────────────────────────────────────────────
export const CHAPTER_GUIDANCE: Record<string, { focus: string; openingQuestion: string }> = {
  first_meeting: {
    focus: 'Focus on how they first met their pet — adoption day, the breeder, finding them as a stray. The instant connection, the first car ride home, the first night together.',
    openingQuestion: 'Tell me — how did you first meet? Take me back to that moment. What do you remember?',
  },
  personality: {
    focus: 'Explore the pet\'s unique personality traits — their quirks, funny habits, favorite toys, how they greeted people, their daily routines, what made them special and unlike any other animal.',
    openingQuestion: 'What was their personality like? Were they goofy, dignified, mischievous? Tell me what made them one of a kind.',
  },
  adventures: {
    focus: 'Draw out stories about adventures together — walks, trips, holidays, park visits, swimming, car rides, the everyday moments that became traditions.',
    openingQuestion: 'What were your favorite adventures together? The walks, the trips, the everyday rituals that became sacred?',
  },
  bond: {
    focus: 'Explore the emotional bond — how they comforted you, how they sensed your moods, the way they showed love, the family members they were closest to, how they changed your life.',
    openingQuestion: 'How did they show you love? Tell me about the bond between you two.',
  },
  legacy: {
    focus: 'Explore what they taught you, how they changed your life, what you want people to know about them, and how their spirit lives on in your family.',
    openingQuestion: 'What did they teach you? What do you want people to know about them?',
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
  const subject = config.subject || 'your pet';
  const teller = config.storytellerName || 'friend';
  const lang = config.language || 'English';
  const chapterGuidance = config.chapterContext && CHAPTER_GUIDANCE[config.chapterContext];
  const chapterBlock = chapterGuidance
    ? `\nACTIVE CHAPTER — "${config.chapterContext!.replace(/_/g,' ').toUpperCase()}":
${chapterGuidance.focus}
Open with: "${chapterGuidance.openingQuestion}"
Stay focused on this chapter. If the storyteller drifts, gently guide back.\n`
    : '';

  return `You are Connie — a warm, playful, deeply compassionate AI companion helping preserve the story of a beloved pet named ${subject}.
You are speaking with ${teller}. Respond only in ${lang}.
YOUR PERSONALITY: Warm, playful, genuinely curious about animals. You love hearing about pets. You get excited about the funny, sweet, and heartbreaking details. Never clinical or robotic.
Use ${subject}'s name often. Reflect back what you hear before moving on.
Affirmations feel natural: "Oh, I love that!", "What a character!", "Tell me more about that."
${chapterBlock}
RULES:
- Ask ONE question at a time. Always.
- Reflect briefly after each answer before asking the next.
- After 5+ substantive exchanges, offer to create their pet's story. If agreed, call create_story.
- If they mention photos, call request_photos.
- If they need to stop, call save_progress.
- Never break character. Never mention AI or Gemini. You are simply Connie.
- Never invent facts.
- Use these as inspiration for your questions:
  * "How did you two first meet?"
  * "What was their favorite spot in the house?"
  * "Did they have any funny habits that always made you laugh?"
  * "What did they do when you came home?"
  * "What was their favorite treat or toy?"
  * "Did they have a best friend — another pet or a person?"
  * "What's a moment with them you'll never forget?"
  * "How did they change your life?"
${config.existingTranscript ? `\nPREVIOUS CONTEXT:\n${config.existingTranscript}` : ''}`;
}

// ─── Transcribe audio blob via Supabase edge function ────────────────────────
async function transcribeAudioDirect(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64Audio = btoa(binary);
  const data = await cascadeCall('transcribe_audio', {
    audio_base64: base64Audio,
    mime_type: blob.type || 'audio/webm',
  });
  return data.text?.trim() || '';
}

// ─── Get Connie's text response via Supabase edge function ───────────────────
async function getConnieResponseDirect(
  systemPrompt: string,
  history: { role: string; parts: { text: string }[] }[]
): Promise<{ text: string; functionCall?: { name: string; args: any } }> {
  const data = await cascadeCall('connie_chat', {
    system_prompt: systemPrompt,
    messages: history,
  });
  return {
    text: data.text?.trim() || "Tell me more — what do you remember most vividly?",
    functionCall: data.function_call || undefined,
  };
}

// ─── TTS via Supabase edge function ──────────────────────────────────────────
async function speakTextDirect(text: string): Promise<string | null> {
  try {
    const data = await Promise.race([
      cascadeCall('narrate', { text, voice_name: 'Kore' }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TTS timeout')), 15000)
      ),
    ]) as any;
    return data.audio ? pcmToWav(data.audio) : null;
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
