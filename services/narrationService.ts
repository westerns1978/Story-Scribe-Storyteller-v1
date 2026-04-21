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

// ─── Global failure telemetry ───
// A running count of successive narrateText calls that returned no audio.
// CinematicReveal reads this to latch a persistent "Narration unavailable"
// indicator when the failure is clearly systemic (not a one-off flake).
// Reset to 0 on the first successful call.
let _narrationFailureStreak = 0;
let _lastNarrationFailure: { kind: string; reason: string; at: number } | null = null;

export function getNarrationFailureStreak(): number {
  return _narrationFailureStreak;
}
export function getLastNarrationFailure(): { kind: string; reason: string; at: number } | null {
  return _lastNarrationFailure;
}
export function resetNarrationFailureStreak(): void {
  _narrationFailureStreak = 0;
  _lastNarrationFailure = null;
}

function recordFailure(kind: string, reason: string) {
  _narrationFailureStreak++;
  _lastNarrationFailure = { kind, reason, at: Date.now() };
}

// ─── Main export: narrate text via edge function ───
export async function narrateText(
  text: string,
  voiceName = 'Aoede'
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
        voice_name: voiceName, // matches edge function: const { text, voice_name = 'Aoede' } = body
      }),
    });

    // Always read the raw body so we can log it verbatim — the previous
    // version logged `data` which the console renders as "Object".
    const rawBody = await response.text();
    let parsed: any = null;
    try { parsed = JSON.parse(rawBody); } catch {}

    if (!response.ok) {
      // Edge function now returns 502 with { error, primary_kind, attempts }
      // on total TTS failure. Extract and log so the user-visible banner
      // can hint at the root cause (billing / quota / model missing).
      const kind = parsed?.primary_kind || `HTTP_${response.status}`;
      const reason = parsed?.error || rawBody.slice(0, 400) || 'no body';
      console.error(
        `[narrationService] Edge function error (HTTP ${response.status}, kind=${kind}): ${reason}`,
        parsed?.attempts ? `| attempts=${JSON.stringify(parsed.attempts)}` : ''
      );
      recordFailure(kind, reason);
      return null;
    }

    if (!parsed || !parsed.audio) {
      // 200 with empty/missing audio — same logical failure but different
      // telemetry path (used to print the useless "Object" log line).
      const kind = parsed?.primary_kind || 'EMPTY_200';
      const reason = parsed?.error
        || `no audio field in response body: ${rawBody.slice(0, 400) || 'empty body'}`;
      console.error(
        `[narrationService] No audio in response — kind=${kind}, reason=${reason}, bodyPreview=${rawBody.slice(0, 400)}`,
        parsed?.attempts ? `| attempts=${JSON.stringify(parsed.attempts)}` : ''
      );
      recordFailure(kind, reason);
      return null;
    }

    const audioContext = new AudioContext({ sampleRate: 24000 });
    const audioBuffer = await pcmBase64ToAudioBuffer(parsed.audio, 24000);
    // Success — clear the streak so CinematicReveal drops the "Narration
    // unavailable" indicator if it had been shown.
    _narrationFailureStreak = 0;
    _lastNarrationFailure = null;
    return { audioBuffer, audioContext };
  } catch (err: any) {
    const reason = err?.message || String(err);
    console.error('[narrationService] Failed with exception:', reason);
    recordFailure('EXCEPTION', reason);
    return null;
  }
}

// ─── Global audio singleton — prevents ALL overlapping voices ───
// Every playAudioBuffer call stops whatever was playing before.
// This is the single source of truth for narration audio across
// CinematicReveal, StorybookViewer, YourStoryScreen, MemoryLane, etc.
let _activeStop: (() => void) | null = null;
let _activeCtx: AudioContext | null = null;

export function stopAllAudio(): void {
  if (_activeStop) { try { _activeStop(); } catch {} _activeStop = null; }
  if (_activeCtx) { try { _activeCtx.close(); } catch {} _activeCtx = null; }
}

// ─── Play an AudioBuffer, returns a stop function ───
// ALWAYS stops previous audio first — global singleton, no opt-out.
export function playAudioBuffer(
  audioBuffer: AudioBuffer,
  audioContext: AudioContext,
  options: { onEnded?: () => void; gainValue?: number } = {}
): () => void {
  // Kill any previously playing narration globally
  stopAllAudio();

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = options.gainValue ?? 1.0;

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.start(0);

  const stop = () => { try { source.stop(); } catch {} };

  // Track globally so the next play call can kill this one
  _activeStop = stop;
  _activeCtx = audioContext;
  source.onended = () => {
    // Only clear if we're still the active one (not already replaced)
    if (_activeStop === stop) { _activeStop = null; _activeCtx = null; }
    options.onEnded?.();
  };

  return stop;
}

// ─── Narrate + play in one call (used by CinematicReveal) ───
export async function narrateAndPlay(
  text: string,
  voiceName = 'Aoede',
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
