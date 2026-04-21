// supabase/functions/story-cascade/index.ts
// ============================================
// STORY CASCADE v4.0 â€” gemini-3.1-flash-tts + emotional audio tags
// ============================================
// Changes from v3.8:
// - Added fetch_url action for obituary/external page extraction
//   Server-side fetch, HTML strip, Gemini name extraction
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_KEY') || '';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const MCP_URL = `${SUPABASE_URL}/functions/v1/mcp-orchestrator`;
const EMBEDDING_URL = `${SUPABASE_URL}/functions/v1/embed-document`;

const DEFAULT_ORG_ID = '71077b47-66e8-4fd9-90e7-709773ea6582';
const STORY_BASE_URL = 'https://gemynd-story-scribe-608887102507.us-west1.run.app';

async function callGemini(prompt, options: any = {}) {
  const model = options.model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: options.temperature ?? 0.3, maxOutputTokens: options.maxTokens ?? 16000 },
  };
  if (options.jsonMode) body.generationConfig.responseMimeType = 'application/json';
  if (options.systemInstruction) body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) { const err = await response.text(); throw new Error(`Gemini ${model} failed (${response.status}): ${err}`); }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── TTS: plain warm narration via Gemini Flash TTS ─────────────────────────
// Reverted from gemini-3.1-flash-tts-preview — that model string returns empty
// audio (model name likely doesn't exist in the public API). Going back to
// gemini-2.5-flash-preview-tts which was the proven-working model.
// Tries a cascade of known TTS model IDs for resilience.
const TTS_MODELS = [
  'gemini-2.5-flash-preview-tts',    // proven working (was in production)
  'gemini-2.5-pro-preview-tts',       // older pro variant — some projects have this
  'gemini-3.1-flash-tts-preview',     // aspirational/newer — try last
];

// Classify a non-200 or empty-audio response so we know WHY TTS failed.
// Critical for debugging the "200 OK but no audio" case — which is usually
// a hit spending cap on the AI Studio key (Google returns 200 with an empty
// candidates array and a promptFeedback.blockReason or error field instead
// of a proper 4xx).
function classifyTTSFailure(status: number, rawBody: string): { kind: string; reason: string } {
  const body = (rawBody || '').slice(0, 800);
  if (status === 429) return { kind: 'QUOTA', reason: `429 rate/quota exhausted: ${body}` };
  if (status === 403) {
    if (/billing|quota|consumer|spending|limit/i.test(body)) return { kind: 'BILLING', reason: `403 billing/quota: ${body}` };
    return { kind: 'FORBIDDEN', reason: `403: ${body}` };
  }
  if (status === 404) return { kind: 'MODEL_MISSING', reason: `404 model not found: ${body}` };
  if (status === 400) return { kind: 'BAD_REQUEST', reason: `400: ${body}` };
  if (status >= 500) return { kind: 'UPSTREAM_5XX', reason: `${status}: ${body}` };
  // status 200 with no audio — usually billing/quota masquerading as success,
  // or safety filter rejection. Check for telltale fields.
  if (/blockReason|safety|finishReason|quotaExceeded|billing/i.test(body)) {
    return { kind: 'EMPTY_200_POLICY', reason: `200 but empty — policy/billing flag in body: ${body}` };
  }
  return { kind: 'EMPTY_200', reason: `200 but no audio payload — possible hit spending cap or model deprecation: ${body}` };
}

async function tryTTSModel(model: string, text: string, voiceName: string): Promise<{ audio: string; status: number; rawBody: string; errorKind?: string; errorReason?: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } }
  };
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e: any) {
    const reason = `fetch threw: ${e.message}`;
    console.warn(`[TTS] ${model} NETWORK_ERROR — ${reason}`);
    return { audio: '', status: 0, rawBody: '', errorKind: 'NETWORK_ERROR', errorReason: reason };
  }
  const rawBody = await response.text();
  if (!response.ok) {
    const { kind, reason } = classifyTTSFailure(response.status, rawBody);
    console.warn(`[TTS] ${model} ${kind} (HTTP ${response.status}) — ${reason}`);
    return { audio: '', status: response.status, rawBody, errorKind: kind, errorReason: reason };
  }
  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch (e: any) {
    const reason = `JSON parse failed: ${e.message} — body head: ${rawBody.slice(0, 300)}`;
    console.warn(`[TTS] ${model} PARSE_ERROR — ${reason}`);
    return { audio: '', status: 200, rawBody, errorKind: 'PARSE_ERROR', errorReason: reason };
  }
  const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (audioData) return { audio: audioData, status: 200, rawBody: '' }; // drop rawBody on success to keep logs clean
  const { kind, reason } = classifyTTSFailure(200, rawBody);
  // Include finishReason + promptFeedback explicitly — top indicators of billing/safety blocks
  const finishReason = data?.candidates?.[0]?.finishReason;
  const promptFeedback = data?.promptFeedback;
  const errField = data?.error;
  console.warn(`[TTS] ${model} ${kind} (HTTP 200, no audio) — finishReason=${finishReason || 'n/a'}, promptFeedback=${JSON.stringify(promptFeedback || null)}, error=${JSON.stringify(errField || null)}, reason=${reason}`);
  return { audio: '', status: 200, rawBody, errorKind: kind, errorReason: reason };
}

async function generateTTS(text: string, voiceName = 'Aoede'): Promise<{ audio: string; attempts: Array<{ model: string; kind: string; reason: string }> }> {
  console.log(`[TTS] generateTTS called: ${text.length} chars, voice=${voiceName}, preview="${text.slice(0, 80).replace(/\s+/g, ' ')}..."`);
  const attempts: Array<{ model: string; kind: string; reason: string }> = [];
  for (const model of TTS_MODELS) {
    console.log(`[TTS] → trying ${model}`);
    try {
      const result = await tryTTSModel(model, text, voiceName);
      if (result.audio) {
        console.log(`[TTS] ✓ ${model} succeeded (${result.audio.length} base64 chars)`);
        return { audio: result.audio, attempts };
      }
      attempts.push({ model, kind: result.errorKind || 'UNKNOWN', reason: result.errorReason || 'no audio returned' });
      // Always try the next model — previously only 429 triggered continue,
      // but billing/empty-200 should also cascade through the fallback chain.
    } catch (e: any) {
      const reason = `threw: ${e.message}`;
      console.warn(`[TTS] ${model} THREW — ${reason}`);
      attempts.push({ model, kind: 'EXCEPTION', reason });
    }
  }
  // Top-level summary line the operator can grep for in edge logs.
  console.error(`[TTS] ✗ ALL TTS MODELS FAILED — ${TTS_MODELS.length} attempts exhausted. Summary: ${JSON.stringify(attempts)}`);
  return { audio: '', attempts };
}

async function callMCP(tool: string, params: any) {
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ agent: 'STORY_SCRIBE', tool, params }),
  });
  if (!response.ok) throw new Error(`MCP ${tool} failed: ${await response.text()}`);
  return response.json();
}

async function embedStory(sessionId: string, narrative: string, storytellerName: string) {
  try {
    await fetch(EMBEDDING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ action: 'store', text: `${storytellerName}: ${narrative.substring(0, 3000)}`, fileId: sessionId, tableName: 'storyscribe_stories', appId: 'story_scribe' }),
    });
  } catch (e: any) { console.warn('[Cascade] Embedding failed:', e.message); }
}

function extractJson(text: string) {
  if (!text) return null;
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  try { return JSON.parse(cleaned); } catch { }
  let depth = 0, start = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (cleaned[i] === '}') { depth--; if (depth === 0 && start !== -1) { try { return JSON.parse(cleaned.substring(start, i + 1)); } catch { } start = -1; } }
  }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { } }
  return null;
}

function detectEthnicityFromTranscript(transcript: string) {
  if (/\bblack\b|african.american|hbcu|historically black|negro|colored school|segregat/i.test(transcript)) return 'Black man';
  if (/hispanic|latino|latina|chicano|mexican.american|puerto rican/i.test(transcript)) return 'Hispanic person';
  if (/\bAsian\b|chinese.american|japanese.american|korean.american|vietnamese.american/i.test(transcript)) return 'Asian person';
  if (/native american|american indian|tribal|first nation/i.test(transcript)) return 'Native American person';
  return '';
}

function buildCharacterDescription(name: string, extraction: any, photoFacts: any, transcript: string) {
  const parts = [name];
  const subject = extraction.subject || {};
  if (photoFacts && photoFacts.length > 0) {
    const appearanceFacts = photoFacts.filter((f: string) => /color|hair|eye|skin|height|build|wearing|coat|fur|breed|markings|complexion|age|appearance|black|white|asian|hispanic|african|lab|labrador|retriever|golden|terrier|poodle|shepherd|spaniel|husky|dog|cat|horse|pet|animal|tail|paw|snout|muzzle/i.test(f));
    parts.push(...(appearanceFacts.length > 0 ? appearanceFacts : photoFacts).slice(0, 3));
  } else {
    const eth = subject.ethnicity || subject.background || subject.race || '';
    if (eth && eth.toLowerCase() !== 'unknown') parts.push(eth);
    else if (transcript) { const d = detectEthnicityFromTranscript(transcript); if (d) parts.push(d); }
    if (subject.physical_description) parts.push(subject.physical_description);
    if (subject.born || extraction.born) parts.push(`born ${subject.born || extraction.born}`);
    if (extraction.setting?.primary || subject.location) parts.push(extraction.setting?.primary || subject.location);
    if (subject.occupation || subject.role) parts.push(subject.occupation || subject.role);
  }
  return parts.filter(Boolean).join(', ');
}

function determineStyleContext(extraction: any) {
  const years = (extraction.timeline || []).map((e: any) => parseInt(String(e.year), 10)).filter((y: number) => !isNaN(y) && y > 1800);
  const firstYear = years.length > 0 ? Math.min(...years) : 1950;
  const mood = extraction.emotional_journey?.overall_tone || extraction.themes?.[0] || 'nostalgic';
  const location = extraction.locations?.[0]?.name || 'Unknown';
  let style = 'cinematic';
  if (firstYear < 1910) style = 'victorian';
  else if (firstYear < 1946) style = 'vintage';
  else if (firstYear < 1970) style = 'technicolor';
  else if (firstYear < 1990) style = 'nostalgic';
  return { style, era: `${Math.floor(firstYear / 10) * 10}s era`, mood, location };
}

const STYLE_TEMPLATES: any = {
  'cinematic': { structural_mandate: `STRUCTURE \u2014 CINEMATIC DOCUMENTARY:\nOpen IN MEDIA RES \u2014 drop the reader into a specific vivid moment already in progress. NOT "she was born in..." \u2014 instead "The summer of 1962, the factory whistle had just sounded..."\nStructure: Opening scene \u2192 pull back to reveal context \u2192 build through escalating specificity \u2192 land on the defining moment \u2192 close with wide shot that gives meaning to everything before it.\nThink in scenes: ESTABLISHING SHOT \u2192 CLOSE UP \u2192 FLASHBACK \u2192 PRESENT DAY \u2192 FADE OUT.\nEvery paragraph is a different camera angle on the same person.`, opening_instruction: 'Open with a specific sensory moment \u2014 sound, smell, physical sensation \u2014 that drops the reader INTO the scene with no preamble.', closing_instruction: 'End with a wide shot \u2014 zoom out from the specific person to what they represent to everyone who loved them.' },
  'nonlinear': { structural_mandate: `STRUCTURE \u2014 NON-LINEAR / MEMORY:\nMANDATORY: Do NOT tell this story chronologically.\n1. Open NEAR THE END \u2014 a specific recent moment, object, or sensation connected to this person.\n2. Let that detail pull you BACKWARD to their earliest defining memory.\n3. Move FORWARD to a mid-life peak moment.\n4. Return to the PRESENT with new understanding.\n5. Close by circling back to the opening image \u2014 but now it means something different.\nUse one recurring motif (an object, a phrase, a sound) as the thread connecting all time jumps.`, opening_instruction: 'Open with something small from near the end of their life that contains the whole of who they were \u2014 a habit, an object, a sound.', closing_instruction: 'Return to the opening image \u2014 but now, having traveled through the whole life, the reader understands it completely.' },
  'poetic': { structural_mandate: `STRUCTURE \u2014 LYRICAL / POETIC:\nEvery sentence earns its place. Write slowly. Use one extended metaphor as a spine running through the entire piece.\nThink in images, not facts. "She was a nurse for 40 years" becomes "for forty years, she held the hands of strangers at the exact moment they needed holding most."\nRhythm matters: vary sentence length deliberately. Short sentences land like stones. Longer sentences carry the reader somewhere warm before the next stone drops.\nEVERY paragraph must contain one image so specific and true that the reader gasps.`, opening_instruction: 'Open with a metaphor that will carry the entire piece. Choose it carefully \u2014 it needs to hold the weight of a whole life.', closing_instruction: 'Return the opening metaphor, transformed by everything that came between. The last line must be impossible to forget.' },
  'adventure': { structural_mandate: `STRUCTURE \u2014 ADVENTUROUS SAGA:\nFrame this life as a great journey \u2014 hero, quest, obstacles overcome, wisdom earned.\nMANDATORY STRUCTURE:\n1. Introduce the hero in their element \u2014 what were they best at?\n2. Name the quest \u2014 what were they after, building, or protecting?\n3. The obstacle \u2014 what did they have to overcome?\n4. The triumph \u2014 often quiet \u2014 the moment they became who they were.\n5. The legacy \u2014 what continues their journey through others?\nLanguage: ACTIVE, FORWARD-MOVING. Verbs carry the weight. No passive voice.`, opening_instruction: 'Open with the hero at their most capable \u2014 what did they do better than anyone else? Start there.', closing_instruction: 'End not with ending but with continuation \u2014 what of them goes on? Who carries the quest forward?' },
  'intimate': { structural_mandate: `STRUCTURE \u2014 INTIMATE / DIRECT ADDRESS:\nWrite directly to the family reading this. Use "your mother" "your father" "the person you knew as..."\nThis is NOT a public eulogy. It is a private document of recognition. Write what families think but rarely say aloud.\nUse "you know" and "you remember" \u2014 pull the reader into shared memory.\nGive language to the love they felt but may never have fully named.\nTone: warm, unhurried, completely private.`, opening_instruction: 'Open by speaking directly to the reader \u2014 "You already know who she was. But let me try to say it anyway..."', closing_instruction: 'End with something that gives the family permission to feel what they feel \u2014 not consolation, but recognition.' },
  'oral': { structural_mandate: `STRUCTURE \u2014 ORAL TRADITION / STORYTELLER:\nWrite as a master storyteller passing this story to grandchildren around a fire.\nUse "she used to say..." and "now listen, because this part matters..." and "the family always remembered..."\nThis style is SPOKEN, not written. Contractions. Repetition for emphasis. Digressions that circle back.\nThe reader should be able to HEAR this being told aloud.`, opening_instruction: 'Open with an invitation \u2014 "Now, let me tell you about..." or "There\'s a story this family tells..." \u2014 pull the reader into the circle.', closing_instruction: 'End with what continues \u2014 "And that is why, to this day, the family still..." Something that lives on.' },
  'Eloquent (Biographical)': { structural_mandate: `STRUCTURE \u2014 ELOQUENT BIOGRAPHICAL:\nThis is the definitive written record of this life \u2014 the document that will outlast everyone.\nWrite with gravitas and warmth in equal measure. Facts carry emotion. Specificity is everything.\nStructure: Birth and roots \u2192 formation \u2192 contribution \u2192 relationships \u2192 legacy.\nEvery claim grounded in source material. Every flourish earned by a specific detail.`, opening_instruction: 'Open with the essential nature of this person \u2014 not a fact, but the quality that defined everything else about them.', closing_instruction: 'Close with the legacy \u2014 not what they did, but what continues because they lived.' },
  'Cinematic (Non-Linear)': { structural_mandate: `STRUCTURE \u2014 CINEMATIC / NON-LINEAR:\nOpen IN MEDIA RES \u2014 drop the reader into a specific vivid moment already in progress.\nThen move through time the way memory does \u2014 not chronologically, but by emotional gravity.\nUse one recurring motif as the thread. End by returning to the opening moment with new meaning.\nEvery paragraph is a different camera angle. Build to one defining scene, then pull back wide.`, opening_instruction: 'Open with a specific sensory moment that drops the reader in with no preamble. Then let memory pull you backwards.', closing_instruction: 'Return to the opening image \u2014 transformed. The reader should understand it now in a way they couldn\'t at the start.' },
  'Poetic & Soulful': { structural_mandate: `STRUCTURE \u2014 LYRICAL / POETIC:\nEvery sentence earns its place. Use one extended metaphor as a spine through the entire piece.\nThink in images. "She worked hard" becomes "she wore her effort the way others wear jewelry \u2014 quietly, always."\nEVERY paragraph must contain one image so specific and true it makes the reader catch their breath.`, opening_instruction: 'Open with a metaphor that will carry the entire piece.', closing_instruction: 'Return the opening metaphor, transformed. The last line must be impossible to forget.' },
  'Adventurous Saga': { structural_mandate: `STRUCTURE \u2014 ADVENTUROUS SAGA:\nFrame this life as a great journey. Hero, quest, obstacle, triumph, legacy.\nACTIVE, FORWARD-MOVING language always. Verbs carry the weight. No passive voice.\n"She built." "He fought." "They created." Each paragraph moves toward something.`, opening_instruction: 'Open with the hero at their most capable \u2014 what did they do better than anyone else?', closing_instruction: 'End with continuation \u2014 what of them goes on? Who carries the quest forward?' },
  'Standard Narrative': { structural_mandate: `STRUCTURE \u2014 STANDARD NARRATIVE:\nClear, warm, accessible. Chronological with emotional depth. No experimental structure.\nEvery paragraph earns the next. Accessible to all family members including children.\nWarm but not saccharine. Honest but not clinical.`, opening_instruction: 'Open with the most vivid thing you know about them \u2014 the detail that contains their whole character.', closing_instruction: 'Close with love and specificity \u2014 what did they leave that the family carries forward?' },
  'Journalistic / Interview': { structural_mandate: `STRUCTURE \u2014 JOURNALISTIC / INTERVIEW:\nWrite as a seasoned journalist who has just spent hours with this family. Lead with the most compelling detail \u2014 the hook.\nUse the inverted pyramid: most important first, context second, background third.\nQuotes (real or paraphrased from the transcript) carry enormous weight. Use them.\nBe precise. Be specific. Let the facts create the emotion \u2014 don't manufacture it.`, opening_instruction: 'Open with the hook \u2014 the one detail that made you lean forward when you heard it.', closing_instruction: 'End with a quote or a specific image that lets the subject speak for themselves.' },
};

function getStyleTemplate(narrativeStyle: string) {
  if (STYLE_TEMPLATES[narrativeStyle]) return STYLE_TEMPLATES[narrativeStyle];
  const lower = narrativeStyle.toLowerCase();
  if (lower.includes('non-linear') || lower.includes('nonlinear')) return STYLE_TEMPLATES['nonlinear'];
  if (lower.includes('cinematic')) return STYLE_TEMPLATES['cinematic'];
  if (lower.includes('poetic') || lower.includes('soulful')) return STYLE_TEMPLATES['poetic'];
  if (lower.includes('adventure') || lower.includes('saga')) return STYLE_TEMPLATES['adventure'];
  if (lower.includes('intimate') || lower.includes('letter')) return STYLE_TEMPLATES['intimate'];
  if (lower.includes('oral') || lower.includes('tradition')) return STYLE_TEMPLATES['oral'];
  if (lower.includes('journalistic') || lower.includes('interview')) return STYLE_TEMPLATES['Journalistic / Interview'];
  if (lower.includes('standard')) return STYLE_TEMPLATES['Standard Narrative'];
  return STYLE_TEMPLATES['Eloquent (Biographical)'];
}

function deriveMusicQuery(extraction: any) {
  const tone = (extraction.emotional_journey?.overall_tone || extraction.themes?.[0] || '').toLowerCase();
  const toneMap: any = { joyful: 'uplifting warm family love hopeful', hopeful: 'hopeful inspiring gentle warm', melancholic: 'melancholic reflective piano loss nostalgic', triumphant: 'cinematic epic orchestral inspiring triumph', tender: 'tender soft gentle romantic intimate', reflective: 'reflective nostalgic emotional memory', peaceful: 'peaceful serene nature calm ambient', nostalgic: 'nostalgic memory past sentimental warm', spiritual: 'spiritual solemn sacred moving', somber: 'melancholic loss solemn reflective', warm: 'warm family love uplifting gentle', bittersweet: 'nostalgic memory tender bittersweet piano', inspiring: 'inspiring orchestral triumph cinematic', courageous: 'cinematic epic orchestral triumph inspiring', resilient: 'inspiring hopeful triumph orchestral', loving: 'warm tender romantic intimate family', adventurous: 'adventurous cinematic epic journey' };
  for (const [key, query] of Object.entries(toneMap)) { if (tone.includes(key)) return query; }
  const themes = (extraction.themes || []).join(' ').toLowerCase();
  if (themes.includes('faith') || themes.includes('spiritual')) return 'spiritual solemn sacred moving';
  if (themes.includes('family') || themes.includes('love')) return 'warm family tender love';
  if (themes.includes('war') || themes.includes('service')) return 'cinematic dramatic orchestral solemn';
  if (themes.includes('journey') || themes.includes('travel')) return 'adventurous cinematic journey';
  if (tone.includes('pet') || tone.includes('companion') || tone.includes('beloved')) return 'gentle warm tender loving peaceful';
  return 'reflective nostalgic emotional memory warm';
}

async function generateAllNarration(scribeData: any, supabase: any, sessionId: string, _petMode = false) {
  try {
    const beats = scribeData.storyboard?.story_beats || [];
    const narrateItems: any[] = [];
    if (scribeData.opening_line) narrateItems.push({ beat_index: -1, text: scribeData.opening_line });
    beats.forEach((beat: any, i: number) => {
      const text = beat.pull_quote || beat.narrative_chunk?.slice(0, 200) || beat.beat_title || '';
      if (text.trim()) narrateItems.push({ beat_index: i, text });
    });
    console.log(`[Narrator] Generating narration for ${narrateItems.length} scenes (voice=Aoede)...`);
    const results = await Promise.allSettled(
      narrateItems.map((item: any) =>
        generateTTS(item.text, 'Aoede')
          .then(({ audio }) => ({ beat_index: item.beat_index, audio_base64: audio, text: item.text }))
          .catch(() => null)
      )
    );
    const narrationAudio = results
      .filter((r: any) => r.status === 'fulfilled' && r.value !== null && r.value.audio_base64)
      .map((r: any) => r.value);
    if (narrationAudio.length > 0) {
      const { error } = await supabase.from('storyscribe_stories').update({ narration_audio: narrationAudio }).eq('session_id', sessionId);
      if (error) console.error('[Narrator v3.4] Save failed:', error.message);
      else console.log(`[Narrator v3.4] Saved ${narrationAudio.length}/${narrateItems.length} clips for ${sessionId}`);
    }
  } catch (e: any) { console.warn('[Narrator v3.4] Non-fatal error:', e.message); }
}

async function pollGrokVideo(requestId: string, xaiHeaders: any, label: string) {
  const maxPolls = 60;
  for (let i = 0; i < maxPolls; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const poll = await fetch(`https://api.x.ai/v1/videos/${requestId}`, { headers: xaiHeaders });
      if (poll.ok) {
        const data = await poll.json();
        console.log(`[Movie] ${label} poll ${i + 1}: ${data.status}`);
        if (data.status === 'done') return data.video?.url ?? null;
        if (data.status === 'error') throw new Error(`Grok error on ${label}: ${data.error || 'unknown'}`);
      }
    } catch (e: any) { console.warn(`[Movie] ${label} poll ${i + 1} failed:`, e.message); }
  }
  return null;
}

async function submitGrokExtend(videoUrl: string, prompt: string, xaiKey: string) {
  const resp = await fetch('https://api.x.ai/v1/videos/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'grok-imagine-video', prompt, video: { url: videoUrl }, duration: 10, aspect_ratio: '16:9', resolution: '720p' }),
  });
  if (!resp.ok) { console.warn(`[Movie] Extend submit failed: ${resp.status} ${await resp.text()}`); return null; }
  const data = await resp.json();
  return data.request_id ?? null;
}

async function pollAndStoreMovie(requestId: string, sessionId: string, storytellerName: string, supabase: any, extendPrompt?: string) {
  console.log(`[Movie] Starting 3-segment extend chain for ${storytellerName}`);
  const XAI_KEY = Deno.env.get('XAI_API_KEY') ?? '';
  const xaiHeaders = { 'Authorization': `Bearer ${XAI_KEY}` };
  const seg1Url = await pollGrokVideo(requestId, xaiHeaders, 'Segment 1');
  if (!seg1Url) {
    const { data: c } = await supabase.from('storyscribe_stories').select('assets').eq('session_id', sessionId).single();
    await supabase.from('storyscribe_stories').update({ assets: { ...(c?.assets || {}), movie_status: 'timeout' } }).eq('session_id', sessionId);
    return;
  }
  const prompt2 = extendPrompt || 'Continue the cinematic documentary tribute. Maintain visual continuity, warm lighting, and emotional atmosphere. Second chapter of the life story.';
  const seg2RequestId = await submitGrokExtend(seg1Url, prompt2, XAI_KEY);
  let seg2Url = null;
  if (seg2RequestId) seg2Url = await pollGrokVideo(seg2RequestId, xaiHeaders, 'Segment 2');
  let seg3Url = null;
  if (seg2Url) {
    const prompt3 = extendPrompt || 'Continue and conclude the cinematic documentary tribute. Final chapter \u2014 legacy, love, and what endures. Warm, emotional closing.';
    const seg3RequestId = await submitGrokExtend(seg2Url, prompt3, XAI_KEY);
    if (seg3RequestId) seg3Url = await pollGrokVideo(seg3RequestId, xaiHeaders, 'Segment 3');
  }
  const finalVideoUrl = seg3Url || seg2Url || seg1Url;
  const segmentsCompleted = seg3Url ? 3 : seg2Url ? 2 : 1;
  const estimatedDurationSec = segmentsCompleted * 10;
  const vidResp = await fetch(finalVideoUrl);
  if (!vidResp.ok) throw new Error(`MP4 download failed: ${vidResp.status}`);
  const mp4Buffer = await vidResp.arrayBuffer();
  const safeName = storytellerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const storagePath = `stories/${safeName}/movie_${sessionId.slice(0, 8)}.mp4`;
  const { error: uploadError } = await supabase.storage.from('scans').upload(storagePath, mp4Buffer, { contentType: 'video/mp4', upsert: true });
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
  const mp4Url = `${SUPABASE_URL}/storage/v1/object/public/scans/${storagePath}`;
  const sizeMb = Math.round(mp4Buffer.byteLength / 1024 / 1024 * 10) / 10;
  const { data: cur } = await supabase.from('storyscribe_stories').select('assets').eq('session_id', sessionId).single();
  await supabase.from('storyscribe_stories').update({ assets: { ...(cur?.assets || {}), movie_status: 'done', movie_url: mp4Url, movie_size_mb: sizeMb, movie_segments: segmentsCompleted, movie_duration_sec: estimatedDurationSec, movie_completed_at: new Date().toISOString() } }).eq('session_id', sessionId);
  console.log(`[Movie] Done \u2014 ${mp4Url} (${sizeMb}MB, ${segmentsCompleted} segments, ~${estimatedDurationSec}s)`);
}

async function runCascade(transcript: string, storytellerName: string, narrativeStyle: string, artifactTexts: string[] = [], options: any = {}) {
  const steps: any = {};
  const includeImages = options.includeImages !== false;
  const petMode = options.petMode === true;
  const language = options.language || 'en';
  const languageInstruction = language !== 'en' ? `\n\nIMPORTANT: Write the ENTIRE narrative in ${language === 'es' ? 'Spanish' : language === 'fr' ? 'French' : language === 'zh' ? 'Mandarin Chinese' : language === 'vi' ? 'Vietnamese' : language === 'ko' ? 'Korean' : language === 'tl' ? 'Tagalog' : language === 'hi' ? 'Hindi' : language === 'af' ? 'Afrikaans' : 'English'}. Every word of the story must be in this language.` : '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const artifactContext = artifactTexts.filter(Boolean).join('\n---\n');
  const buildUploadedPhotosBlock = () => {
    if (!options.uploadedPhotos || options.uploadedPhotos.length === 0) return '';
    const photoLines = options.uploadedPhotos.map((p: any, i: number) => 'Photo ' + (i + 1) + ': era="' + (p.era || 'unknown') + '", facts="' + ((p.facts || []).slice(0, 2).join('; ') || 'none') + '", url="' + p.url + '"').join('\n');
    return '\n\nUPLOADED PHOTOGRAPHS (match to nearest story beat by era/content)\n' + 'Each photo should be assigned as anchor_photo to the most relevant beat.\n' + photoLines + '\n' + 'In the storyboard story_beats, add: "anchor_photo": { "url": "...", "era": "...", "caption": "The real [name]" }\n' + 'If a beat has no matching photo, omit anchor_photo entirely.\n';
  };
  const verifiedFactsBlock = (options.verifiedPhotoFacts && options.verifiedPhotoFacts.length > 0)
    ? '\n\nVERIFIED FACTS EXTRACTED FROM UPLOADED PHOTOS\n' + '(These are ground truth \u2014 use them verbatim in the narrative AND in every visual_focus field.)\n' + options.verifiedPhotoFacts.map((f: string, i: number) => `Photo ${i + 1}: ${f}`).join('\n') + '\n\nVISUAL GROUNDING \u2014 CRITICAL FOR IMAGE GENERATION:\n' + 'Every "visual_focus" field in your storyboard MUST begin with the subject physical appearance\n' + 'as described in the verified photo facts above. This ensures every generated image shows the\n' + 'CORRECT person/animal \u2014 not a generic one.\n'
    : '';
  const petMandateBlock = petMode
    ? `This is a PET TRIBUTE. Write with the understanding that the bond between a person and their animal companion is one of the purest forms of love. Use the pet's name throughout \u2014 never clinical terms.\n\nThe goosebumps moments for a pet are the specific things only their family knew: the way they waited by the door, the sound they made, the person they always chose to sit with, the thing they did that no other animal ever did.\n\nYour narrative must contain at least THREE goosebumps moments \u2014 not "she was loyal" but "she always knew when you were sad before you did, and she'd put her head on your knee without being asked." Not "he loved walks" but "he had a specific route he refused to deviate from for eleven years, and after he was gone, you walked it alone once."\n\nUse language of love and companionship. "Family member" not "pet." "Passed away" not "died." Honor the grief \u2014 it is real and often underestimated.`
    : `Your narrative must contain at least THREE "goosebumps moments" \u2014 specific, unexpected details that make the reader feel they are truly seeing this person. Not "she worked hard" but "she could hear an error in a column of numbers by sound." Not "he loved fishing" but "he had a name for every animal he'd encountered in forty years in the field."`;
  const styleTemplate = getStyleTemplate(narrativeStyle);
  const scribePrompt = `You are Agent Scribe \u2014 the finest literary biographer alive. Your task is to create an Immersive Cinematic Legacy Archive for ${storytellerName} that makes family members gasp with recognition and weep with love.\n\nSOURCE MATERIALS:\nTRANSCRIPT: "${transcript}"\nHISTORICAL RECORDS: "${artifactContext}"\n${buildUploadedPhotosBlock()}${verifiedFactsBlock}\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nTHE GOOSEBUMPS MANDATE\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n${petMandateBlock}\n\nSPECIFICITY RULES:\n- Hunt for the ONE detail that makes this person irreplaceable.\n- Every sensory detail must be PERIOD-ACCURATE and LOCATION-ACCURATE.\n- First-person sensory narration lands hardest.\n- Find the unexpected emotional pivot in their story.\n- If VERIFIED FACTS FROM PHOTOS are provided above, you MUST incorporate them directly.\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nFACTUAL GROUNDING \u2014 NON-NEGOTIABLE\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n- Use ONLY names, dates, locations, and events from the source materials. NEVER invent.\n- If a detail isn't in the transcript or verified photo facts, don't include it.\n- Atmospheric details (weather, sounds, smells of an era) are acceptable if period-accurate.\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nLIFE MAP / LOCATION GUARDRAIL \u2014 CRITICAL\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nFor the "locations" array in your JSON output:\n- ONLY include a location if a specific city, town, country, or named place is EXPLICITLY stated in the transcript or verified photo facts.\n- DO NOT infer or guess locations from context clues.\n- If no explicit location is mentioned, return an empty locations array: []\n- A location must have a direct quote or clear statement in source material to be included.\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nSENSITIVITY GUARDRAILS \u2014 FAMILIES WILL READ THIS\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nALWAYS handle with dignity and grace: cause of death, mental illness, addiction, divorce, financial hardship, faith, children who died, war service.\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\nNARRATIVE ARCHITECTURE\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n${styleTemplate.structural_mandate}\n\nOPENING INSTRUCTION: ${styleTemplate.opening_instruction}\nCLOSING INSTRUCTION: ${styleTemplate.closing_instruction}\n\nWrite a 1000-word literary narrative. For storyboard beats, each beat_title should be evocative. Each narrative_chunk should be 3-4 sentences, self-contained, and emotionally resonant.\n\nOUTPUT JSON:\n{\n  "narrative": "string (1000-word literary narrative with goosebumps moments)",\n  "summary": "string (2-3 sentences capturing essential spirit)",\n  "opening_line": "string (the cinematic first line)",\n  "closing_line": "string (the essential spirit line)",\n  "goosebumps_moments": ["array of the 3+ specific details that make this person irreplaceable"],\n  "subject": {"name": "string", "ethnicity": "REQUIRED", "physical_description": "string", "background": "string", "born": "string", "occupation": "string"},\n  "people": [{"name": "string", "relationship": "string", "role": "string"}],\n  "timeline": [{"year": "string", "event": "string", "significance": "string", "historical_context": "string", "evocative_narration": "string"}],\n  "locations": [{"name": "string", "type": "string", "source": "exact quote from transcript that confirms this location"}],\n  "themes": ["string"],\n  "life_lessons": ["string"],\n  "key_quotes": ["string"],\n  "sensory_details": ["string"],\n  "emotional_journey": {"overall_tone": "string", "arc": "string", "pivot_moment": "string"},\n  "artifacts": [{"name": "string", "type": "string", "description": "string", "era": "string", "image_prompt": "string"}],\n  "storyboard": {\n    "visual_dna": "string",\n    "story_beats": [{"beat_title": "string", "narrative_chunk": "string", "visual_focus": "string", "directors_notes": "string", "pull_quote": "string", "anchor_photo": "object or null"}]\n  }\n}${languageInstruction}`;
  console.log('[Cascade] Step 1: Agent Scribe (v3.9)...');
  const scribeRaw = await callGemini(scribePrompt, { jsonMode: true, temperature: 0.45, maxTokens: 16000 });
  let scribeData = extractJson(scribeRaw);
  if (!scribeData) { const stripped = scribeRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim(); try { scribeData = JSON.parse(stripped); } catch { } }
  if (!scribeData) { const looksLikeNarrative = !scribeRaw.trim().startsWith('{') && scribeRaw.length > 200; scribeData = looksLikeNarrative ? { narrative: scribeRaw.substring(0, 4000), summary: 'Story generated.', timeline: [], storyboard: { story_beats: [] }, artifacts: [] } : { narrative: 'Story generation encountered an issue. Please try again.', summary: '', timeline: [], storyboard: { story_beats: [] }, artifacts: [] }; }
  if (scribeData.narrative && typeof scribeData.narrative === 'string') { const trimmed = scribeData.narrative.trim(); if (trimmed.startsWith('{') || trimmed.startsWith('[')) { try { const inner = JSON.parse(trimmed); if (inner && typeof inner === 'object') { scribeData = inner; } } catch { } } }
  if (Array.isArray(scribeData.locations)) { scribeData.locations = scribeData.locations.filter((loc: any) => { if (!loc.source || loc.source.trim() === '' || loc.source === 'inferred' || loc.source === 'unknown') return false; return true; }); }
  steps.scribe = { status: 'completed', keys: Object.keys(scribeData) };
  const characterDescription = buildCharacterDescription(storytellerName, scribeData, options.verifiedPhotoFacts, transcript);
  const styleContext = determineStyleContext(scribeData);
  console.log('[Cascade] Step 2: Agent Validator...');
  let validation: any = { verified: true, issues: [], accuracy_score: 0 };
  try { const validatorPrompt = `Fact-check this memoir narrative against the original transcript.\nORIGINAL: "${transcript.substring(0, 3000)}"\nNARRATIVE: "${scribeData.narrative?.substring(0, 3000)}"\nAlso flag any content that could be hurtful to families.\nReturn JSON: { "verified": true/false, "accuracy_score": 0-100, "issues": ["factual discrepancies"], "sensitivity_flags": ["potentially hurtful content"], "corrections": ["suggested corrections"] }`; const validatorRaw = await callGemini(validatorPrompt, { jsonMode: true, temperature: 0.1 }); validation = extractJson(validatorRaw) || validation; steps.validator = { status: 'completed', accuracy: validation.accuracy_score }; } catch (e: any) { steps.validator = { status: 'skipped', reason: e.message }; }
  let images: any[] = [];
  if (includeImages) {
    console.log('[Cascade] Step 3: Agent Illustrator...');
    try {
      const charPrefix = characterDescription ? `SUBJECT APPEARANCE \u2014 RENDER EXACTLY: ${characterDescription}. DO NOT deviate from this description. Scene: ` : '';
      const beats = (scribeData.storyboard?.story_beats || []).map((beat: any, idx: number) => ({ beat_id: `beat_${idx}`, title: beat.beat_title, visual_prompt: charPrefix + (beat.visual_focus || '') }));
      if (beats.length > 0) {
        const visualDna = petMode ? 'warm painterly illustration, soft golden light, watercolor tones, heartwarming, gentle \u2014 NOT dark, NOT cinematic, NOT dramatic' : (scribeData.storyboard?.visual_dna || 'vintage, cinematic, period-accurate');
        const imageStyle = petMode ? 'warm_family' : styleContext.style;
        const mcpResult = await callMCP('generate_storyboard', { beats, visual_dna: visualDna, story_context: { era: styleContext.era, mood: styleContext.mood, location: styleContext.location }, style: imageStyle, character_description: characterDescription });
        if (mcpResult.success && mcpResult.images) {
          images = await Promise.all(mcpResult.images.map(async (img: any, idx: number) => {
            const beat = scribeData.storyboard.story_beats[idx]; const tempUrl = img.image_url || img.url || ''; let finalUrl = tempUrl;
            if (tempUrl) { try { const imgRes = await fetch(tempUrl); if (imgRes.ok) { const buffer = await imgRes.arrayBuffer(); const safeName = storytellerName.replace(/[^a-z0-9]/gi, '_').toLowerCase(); const path = `stories/${safeName}/beat_${idx}_${Date.now()}.jpg`; const { error: uploadError } = await supabase.storage.from('scans').upload(path, buffer, { contentType: 'image/jpeg', upsert: true }); if (!uploadError) { const { data: urlData } = supabase.storage.from('scans').getPublicUrl(path); finalUrl = urlData.publicUrl; } } } catch (e: any) { console.error(`[Illustrator] Persist exception beat ${idx}:`, e.message); } }
            return { index: idx, success: !!finalUrl, image_url: finalUrl, prompt: beat?.visual_focus || 'Scene', provider: 'Grok Imagine', scene: beat?.beat_title || `Scene ${idx + 1}` };
          }));
        }
      }
      if (scribeData.storyboard?.story_beats) scribeData.storyboard.story_beats = scribeData.storyboard.story_beats.map((beat: any, i: number) => ({ ...beat, image_index: i }));
      steps.illustrator = { status: 'completed', imageCount: images.length };
    } catch (e: any) { steps.illustrator = { status: 'failed', error: e.message }; images = (scribeData.storyboard?.story_beats || []).map((beat: any, i: number) => ({ index: i, success: false, image_url: '', prompt: beat.visual_focus, error: 'Synthesis Interrupted' })); }
  }
  console.log('[Cascade] Step 4: Agent Archivist...');
  let sessionId = crypto.randomUUID();
  try {
    const { error } = await supabase.from('storyscribe_stories').insert({ session_id: sessionId, storyteller_name: storytellerName, transcript, narrative: scribeData.narrative, extraction: { ...scribeData, storyteller: { name: storytellerName } }, storyboard: scribeData.storyboard, assets: { images: images || [], videos: [], audio: [] }, narration_audio: [], status: 'complete', progress: 100, org_id: DEFAULT_ORG_ID, title: `The Story of ${storytellerName}`, saved_at: new Date().toISOString() });
    if (error) throw error; steps.archivist = { status: 'completed', session_id: sessionId }; embedStory(sessionId, scribeData.narrative || transcript, storytellerName);
  } catch (e: any) { steps.archivist = { status: 'failed', error: e.message }; }
  generateAllNarration(scribeData, supabase, sessionId, petMode).catch((e: any) => console.warn('[Cascade] Narrator non-blocking failed:', e.message));
  const shareUrl = `${STORY_BASE_URL}?story=${sessionId}`;
  return { session_id: sessionId, share_url: shareUrl, narrative: scribeData.narrative, opening_line: scribeData.opening_line || '', closing_line: scribeData.closing_line || '', goosebumps_moments: scribeData.goosebumps_moments || [], summary: scribeData.summary, extraction: { storyteller: { name: storytellerName }, timeline: scribeData.timeline || [], key_quotes: scribeData.key_quotes || [], life_lessons: scribeData.life_lessons || [], locations: scribeData.locations || [], themes: scribeData.themes || [], emotional_journey: scribeData.emotional_journey || {}, opening_line: scribeData.opening_line || '', closing_line: scribeData.closing_line || '' }, images, storyboard: scribeData.storyboard, artifacts: scribeData.artifacts || [], beat_audio: [], suggested_music_query: deriveMusicQuery(scribeData), validation, cascade_meta: { steps, character_description: characterDescription, style_context: styleContext } };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const body = await req.json();
    const action = body.action || 'cascade';

    if (action === 'ping') {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'transcribe_audio') {
      const { audio_base64, mime_type = 'audio/webm' } = body;
      if (!audio_base64) return new Response(JSON.stringify({ error: 'audio_base64 is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ inlineData: { data: audio_base64, mimeType: mime_type } }, { text: 'Transcribe this audio accurately. Return only the transcription, nothing else.' }] }] }) });
      if (!res.ok) throw new Error(`Transcription failed: ${await res.text()}`);
      const data = await res.json();
      return new Response(JSON.stringify({ text: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'connie_chat') {
      const { system_prompt, messages: chatMessages = [], subject } = body;
      if (!system_prompt) return new Response(JSON.stringify({ error: 'system_prompt is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const connieFunctions = [ { name: 'request_photos', description: 'Ask the user to upload photos.', parameters: { type: 'OBJECT', properties: { reason: { type: 'STRING' } }, required: ['reason'] } }, { name: 'create_story', description: 'Signal ready to weave the story after 5+ substantive exchanges.', parameters: { type: 'OBJECT', properties: { subject_name: { type: 'STRING' }, confidence: { type: 'STRING' } }, required: ['subject_name'] } }, { name: 'save_progress', description: 'Save conversation so user can return later.', parameters: { type: 'OBJECT', properties: { summary: { type: 'STRING' } }, required: ['summary'] } } ];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const contents = chatMessages.length > 0 ? chatMessages : [{ role: 'user', parts: [{ text: `Please begin with a warm greeting and first gentle question about ${subject || 'the person'}.` }] }];
      const chatRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: system_prompt }] }, contents, tools: [{ function_declarations: connieFunctions }], generation_config: { temperature: 0.8, max_output_tokens: 400 } }) });
      if (!chatRes.ok) throw new Error(`Connie chat failed: ${await chatRes.text()}`);
      const chatData = await chatRes.json();
      const parts = chatData.candidates?.[0]?.content?.parts || [];
      const fnPart = parts.find((p: any) => p.functionCall); const textPart = parts.find((p: any) => p.text);
      return new Response(JSON.stringify({ text: textPart?.text || '', function_call: fnPart ? { name: fnPart.functionCall.name, args: fnPart.functionCall.args } : null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'semantic_search') {
      const { query, match_count = 5 } = body;
      if (!query) return new Response(JSON.stringify({ error: 'query is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const embedRes = await fetch(EMBEDDING_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ action: 'search', text: query, matchCount: match_count, appId: 'story_scribe' }) });
      if (!embedRes.ok) throw new Error(`Semantic search failed: ${await embedRes.text()}`);
      return new Response(JSON.stringify({ matches: (await embedRes.json()).matches || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'get_token' || action === 'get_live_url') {
      const subjectName = body.subject_name || 'their loved one';
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;
      return new Response(JSON.stringify({ ws_url: wsUrl, model: 'models/gemini-2.5-flash-native-audio-preview-12-2025', system_prompt: `You are Connie, a warm and gentle memory curator helping preserve precious memories about ${subjectName}. Speak warmly, ask one question at a time, and listen deeply.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'analyze_photo') {
      const { image_base64, mime_type = 'image/jpeg', photo_data } = body;
      const imageData = image_base64 || photo_data;
      if (!imageData) return new Response(JSON.stringify({ error: 'image_base64 is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ inlineData: { data: imageData, mimeType: mime_type } }, { text: 'You are analyzing a photograph for a family memory preservation archive. Return ONLY valid JSON: {"subject_type":"person/pet/group/other","estimated_age":"string","estimated_era":"string","gender":"string","physical_description":"string","clothing_description":"string","setting_clues":"string","emotional_expression":"string","photo_quality":"string","visible_text":{"jersey_number":null,"jersey_name":null,"team_name":null,"school_name":null,"location_signage":null,"date_stamp":null,"other_text":null},"verified_facts":["string"],"suggested_restoration_style":"string"}' }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } }) });
      if (!res.ok) throw new Error(`Photo analysis failed: ${await res.text()}`);
      const data = await res.json(); let analysis: any;
      try { analysis = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json\s*/gi, '').replace(/```/gi, '').trim() || '{}'); } catch { analysis = {}; }
      return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'analyze_document') {
      const { image_base64, mime_type = 'image/jpeg' } = body;
      if (!image_base64) return new Response(JSON.stringify({ error: 'image_base64 is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ inlineData: { data: image_base64, mimeType: mime_type } }, { text: 'Analyze this image for a memory preservation archive. Return JSON: {"document_type":"string","estimated_era":"string","transcribed_text":"string","description":"string","key_facts":["string"],"emotional_significance":"string","condition":"string","story_contribution":"string"}' }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } }) });
      if (!res.ok) throw new Error('Document analysis failed');
      const data = await res.json(); let docAnalysis: any;
      try { docAnalysis = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json\s*/gi, '').replace(/```/gi, '').trim() || '{}'); } catch { docAnalysis = {}; }
      return new Response(JSON.stringify({ analysis: docAnalysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'extract_pdf_text') {
      const { pdf_base64, mime_type = 'application/pdf' } = body;
      if (!pdf_base64) return new Response(JSON.stringify({ error: 'pdf_base64 is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ inline_data: { data: pdf_base64, mime_type } }, { text: 'Extract all text from this PDF. Return verbatim text only.' }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 8000 } }) });
      if (!res.ok) throw new Error(`PDF extraction failed: ${res.status}`);
      const data = await res.json();
      return new Response(JSON.stringify({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'narrate') {
      const { text, voice_name = 'Aoede' } = body;
      if (!text) return new Response(JSON.stringify({ error: 'text is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { audio, attempts } = await generateTTS(text, voice_name);
      // Return 502 on total failure so the client can distinguish "TTS down"
      // from "no audio requested". Include per-model attempt log so the
      // client-side warning message can surface the actual cause (quota,
      // billing, model-missing, etc.) instead of just "No audio in response".
      if (!audio) {
        const primary = attempts[0]?.kind || 'UNKNOWN';
        return new Response(
          JSON.stringify({ error: 'TTS failed on all fallback models', primary_kind: primary, attempts }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ audio }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // \u2500\u2500 Fetch URL \u2014 server-side proxy for obituary/external pages \u2500\u2500
    if (action === 'fetch_url') {
      const { url } = body;
      if (!url) return new Response(JSON.stringify({ error: 'url is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StoryScribe/1.0)' } });
      if (!pageRes.ok) throw new Error(`Failed to fetch URL (${pageRes.status})`);
      const html = await pageRes.text();
      const plainText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<nav[\s\S]*?<\/nav>/gi, '').replace(/<footer[\s\S]*?<\/footer>/gi, '').replace(/<header[\s\S]*?<\/header>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim().substring(0, 8000);
      let name = '';
      try {
        const nameRaw = await callGemini(`Extract the full name of the deceased person from this obituary text. Return ONLY the name, nothing else \u2014 no quotes, no explanation.\n\nText: "${plainText.substring(0, 2000)}"`, { temperature: 0.0, maxTokens: 50 });
        name = nameRaw.replace(/[\u201c\u201d"]/g, '').trim();
      } catch (e: any) { console.warn('[fetch_url] Name extraction failed:', e.message); }
      return new Response(JSON.stringify({ text: plainText, name }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Time Capsule — historical snapshot for a given year (no session needed) ──
    if (action === 'time_capsule') {
      const { year, location } = body;
      if (!year) return new Response(JSON.stringify({ error: 'year is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const prompt = `You are a historical researcher. Provide a time capsule snapshot for the year ${year}${location ? ` in ${location}` : ''}.

Return ONLY valid JSON with this exact structure:
{
  "news": ["3 major world headlines from ${year}"],
  "culture": ["3 pop culture facts from ${year}"],
  "music": ["3 popular songs from ${year}"],
  "prices": ["3 cost-of-living examples from ${year} e.g. 'Gallon of milk: $0.89'"],
  "context": "A 2-sentence description of what daily life felt like in ${year}"
}

Be historically accurate. Only return the JSON, no other text.`;
      try {
        const raw = await callGemini(prompt, { temperature: 0.3, maxTokens: 2000, jsonMode: true });
        const parsed = extractJson(raw) || {};
        return new Response(JSON.stringify({
          news: Array.isArray(parsed.news) ? parsed.news : [],
          culture: Array.isArray(parsed.culture) ? parsed.culture : [],
          music: Array.isArray(parsed.music) ? parsed.music : [],
          prices: Array.isArray(parsed.prices) ? parsed.prices : [],
          context: typeof parsed.context === 'string' ? parsed.context : '',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e: any) {
        console.error('[time_capsule] Failed:', e.message);
        return new Response(JSON.stringify({ error: `time_capsule failed: ${e.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    if (action === 'generate_movie') {
      const { session_id, storyteller_name, images = [], narrative = '', storyboard } = body;
      if (!session_id || images.length === 0) return new Response(JSON.stringify({ error: 'session_id and images required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const XAI_KEY = Deno.env.get('XAI_API_KEY') ?? '';
      if (!XAI_KEY) return new Response(JSON.stringify({ error: 'XAI_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const beats = storyboard?.story_beats || [];
      const sceneLines = beats.slice(0, 7).map((beat: any, i: number) => `Scene ${i + 1}: ${beat.beat_title || ''} \u2014 ${beat.pull_quote || beat.narrative_chunk?.slice(0, 80) || ''}`).join(' | ');
      const moviePrompt = [`Cinematic documentary tribute to ${storyteller_name}.`, sceneLines || narrative.slice(0, 400), 'Style: slow Ken Burns motion, warm cinematic lighting, cross-dissolve transitions.', 'Atmosphere: emotional, nostalgic, deeply personal. Honor the subject.'].filter(Boolean).join(' ');
      const imageUrls = images.slice(0, 7).map((img: any) => img.image_url || img.url).filter(Boolean);
      const grokBody: any = { model: 'grok-imagine-video', prompt: moviePrompt, duration: 10, aspect_ratio: '16:9', resolution: '720p' };
      if (imageUrls.length === 1) grokBody.image = { url: imageUrls[0] };
      else grokBody.reference_images = imageUrls.map((url: string) => ({ url }));
      const submitResp = await fetch('https://api.x.ai/v1/videos/generations', { method: 'POST', headers: { 'Authorization': `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(grokBody) });
      if (!submitResp.ok) { const err = await submitResp.text(); return new Response(JSON.stringify({ error: `Grok submit failed: ${err}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
      const { request_id } = await submitResp.json();
      const { data: cur } = await supabase.from('storyscribe_stories').select('assets').eq('session_id', session_id).single();
      await supabase.from('storyscribe_stories').update({ assets: { ...(cur?.assets || {}), movie_status: 'generating', movie_request_id: request_id, movie_started_at: new Date().toISOString() } }).eq('session_id', session_id);
      const extendPrompt = beats.length > 0 ? 'Continue this cinematic documentary tribute to ' + storyteller_name + '. Maintain visual style and emotional warmth. ' + (beats[Math.floor(beats.length / 2)]?.pull_quote?.slice(0, 100) || 'Honor their legacy.') : undefined;
      // @ts-ignore
      EdgeRuntime.waitUntil(pollAndStoreMovie(request_id, session_id, storyteller_name, supabase, extendPrompt));
      return new Response(JSON.stringify({ success: true, request_id, session_id, status: 'generating', images_used: imageUrls.length, message: 'Movie generation started.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'generate_narration') {
      const { session_id, use_summary = false, voice_name = 'Aoede' } = body;
      if (!session_id) return new Response(JSON.stringify({ error: 'session_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: story, error: fetchError } = await supabase.from('storyscribe_stories').select('storyteller_name, narrative, ai_summary, assets, narration_audio').eq('session_id', session_id).single();
      if (fetchError || !story) return new Response(JSON.stringify({ error: `Story not found: ${fetchError?.message || 'No data'}` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const rawText = use_summary ? (story.ai_summary || story.narrative || '') : (story.narrative || '');
      if (!rawText.trim()) return new Response(JSON.stringify({ error: 'No narrative text found for this story' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const narrationText = rawText.substring(0, 1500);
      console.log(`[generate_narration] session=${session_id}, chars=${narrationText.length}, voice=${voice_name}`);
      const { audio: audioBase64, attempts: ttsAttempts } = await generateTTS(narrationText, voice_name);
      if (!audioBase64) {
        const primary = ttsAttempts[0]?.kind || 'UNKNOWN';
        return new Response(
          JSON.stringify({ error: 'TTS returned no audio data', primary_kind: primary, attempts: ttsAttempts }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const newEntry = { audio_base64: audioBase64, text: narrationText, source: use_summary ? 'ai_summary' : 'narrative', model: 'gemini-2.5-flash-preview-tts', voice: voice_name, generated_at: new Date().toISOString() };
      const existingNarration = Array.isArray(story.narration_audio) ? story.narration_audio : [];
      await supabase.from('storyscribe_stories').update({ narration_audio: [newEntry, ...existingNarration] }).eq('session_id', session_id);
      console.log(`[generate_narration] ✓ returned ${audioBase64.length} base64 chars for session=${session_id}`);
      return new Response(JSON.stringify({ success: true, session_id, audio_base64: audioBase64, model: 'gemini-2.5-flash-preview-tts', voice: voice_name, chars_narrated: narrationText.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Default: Full cascade
    const { transcript, storyteller_name, narrative_style = 'Eloquent (Biographical)', artifact_texts = [], include_images = true, visual_style = 'Cinematic (Non-Linear)', photo_descriptions = [], verified_photo_facts = [], uploaded_photos = [], pet_mode = false, language = 'en' } = body;
    if (!transcript || !storyteller_name) return new Response(JSON.stringify({ error: 'transcript and storyteller_name are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const enrichedArtifactTexts = [...artifact_texts];
    if (photo_descriptions.length > 0) { const photoContext = photo_descriptions.map((pd: any, i: number) => `[Reference Photo ${i + 1}]: ${pd.ethnicity_appearance || ''}, ${pd.physical_description || ''}, age ${pd.estimated_age || 'unknown'}, era ${pd.estimated_era || 'unknown'}, ${pd.setting_clues || ''}`).join('\n'); enrichedArtifactTexts.unshift(`VISUAL REFERENCE CONTEXT:\n${photoContext}`); }
    console.log(`[story-cascade v3.9] Starting cascade for: ${storyteller_name}`);
    const startTime = Date.now();
    const result = await runCascade(transcript, storyteller_name, narrative_style, enrichedArtifactTexts, { includeImages: include_images, visualStyle: visual_style, verifiedPhotoFacts: verified_photo_facts, uploadedPhotos: uploaded_photos, petMode: pet_mode, language });
    console.log(`[story-cascade v3.9] Complete in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[story-cascade] Fatal error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
