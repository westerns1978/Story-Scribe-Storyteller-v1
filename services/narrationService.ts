// services/narrationService.ts
// ============================================
// SERVER-SIDE NARRATION — Routes through story-cascade edge function
// NO browser-side Gemini calls — works in published build
// ============================================

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';

// ─── Decode base64 PCM (24kHz, mono, 16-bit signed) → Web Audio AudioBuffer ───
async function pcmBase64ToAudioBuffer(base64: string, sampleRate = 24000): Promise<AudioBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;

  const ctx = new AudioContext({ sampleRate });
  const buffer = ctx.createBuffer(1, float32.length, sampleRate);
  buffer.getChannelData(0).set(float32);
  return buffer;
}

// ─── Main export: narrate text via edge function ───
export async function narrateText(
  text: string,
  voiceName = 'Kore'
): Promise<{ audioBuffer: AudioBuffer; audioContext: AudioContext } | null> {
  if (!text?.trim()) return null;

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/story-cascade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'narrate',
        text: text.trim(),
        voice_name: voiceName, // matches edge function: const { text, voice_name = 'Kore' } = body
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[narrationService] Edge function error:', response.status, errText);
      return null;
    }

    const data = await response.json();

    if (!data.audio) {
      console.error('[narrationService] No audio in response:', data);
      return null;
    }

    const audioContext = new AudioContext({ sampleRate: 24000 });
    const audioBuffer = await pcmBase64ToAudioBuffer(data.audio, 24000);
    return { audioBuffer, audioContext };
  } catch (err) {
    console.error('[narrationService] Failed:', err);
    return null;
  }
}

// ─── Play an AudioBuffer, returns a stop function ───
export function playAudioBuffer(
  audioBuffer: AudioBuffer,
  audioContext: AudioContext,
  options: { onEnded?: () => void; gainValue?: number } = {}
): () => void {
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = options.gainValue ?? 1.0;

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.start(0);

  if (options.onEnded) source.onended = options.onEnded;

  return () => {
    try { source.stop(); } catch { /* already stopped */ }
  };
}

// ─── Narrate + play in one call (used by CinematicReveal) ───
export async function narrateAndPlay(
  text: string,
  voiceName = 'Kore',
  options: { onEnded?: () => void; gainValue?: number } = {}
): Promise<(() => void) | null> {
  const result = await narrateText(text, voiceName);
  if (!result) return null;
  return playAudioBuffer(result.audioBuffer, result.audioContext, options);
}

// ─── Analyze photo via edge function (field names match edge function) ───
export async function analyzePhoto(
  file: File
): Promise<Record<string, string> | null> {
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch(`${SUPABASE_URL}/functions/v1/story-cascade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'analyze_photo',
        image_base64: base64,   // ✓ matches edge function: const { image_base64, mime_type } = body
        mime_type: file.type,   // ✓ matches edge function
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.analysis || null;
  } catch (err) {
    console.error('[analyzePhoto] Failed:', err);
    return null;
  }
}
