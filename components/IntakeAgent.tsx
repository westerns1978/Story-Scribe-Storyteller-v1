// components/IntakeAgent.tsx
// ============================================
// Connie's Intake Intelligence Layer
// ============================================
// Sits above GatheringScreen content.
// Silently assesses what's been provided across
// 4 dimensions, then has Connie speak directly
// to the family — warm, specific, unhurried.
//
// Connie is not a form. She is a companion.
// Her job is to draw out the best possible story
// from whatever the family has brought with them.
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IntakeAssessment {
  narrativeDepth: number;    // 0-100: do we know the arc of their life?
  sensoryGrounding: number;  // 0-100: photos, era details, physical reality
  voicePersonality: number;  // 0-100: how they spoke, quirks, what they cared about
  factualAnchors: number;    // 0-100: names, dates, places we can trust
  overallScore: number;      // weighted average
  readyToCreate: boolean;    // true when we have enough for a great story
  dominantGap: 'narrative' | 'sensory' | 'voice' | 'factual' | 'none';
  inputTypes: {
    hasPhotos: boolean;
    hasText: boolean;
    hasVoice: boolean;
    hasDocuments: boolean;
    hasScans: boolean;
  };
}

export interface IntakeAgentProps {
  subject: string;
  transcript: string;
  photoCount: number;
  photoFacts: string[];       // verified facts from photo analysis
  importedTexts: { name: string; content: string }[];
  petMode?: boolean;
  onConnnieSuggestionReady?: (suggestion: ConnieSuggestion) => void;
  onReadyToCreate?: () => void;
}

export interface ConnieSuggestion {
  type: 'tone' | 'followup' | 'opening' | 'missing' | 'ready' | 'greeting';
  text: string;
  action?: string;
  actionLabel?: string;
  appendText?: string;
}

// ─── Supabase config ──────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';
const CASCADE_URL = `${SUPABASE_URL}/functions/v1/story-cascade`;

// ─── Scoring engine ───────────────────────────────────────────────────────────
// Pure client-side — no API call needed for scoring

function assessIntake(props: IntakeAgentProps): IntakeAssessment {
  const { transcript, photoCount, photoFacts, importedTexts, subject } = props;
  const allText = [transcript, ...importedTexts.map(t => t.content)].join(' ');
  const wordCount = allText.trim().split(/\s+/).filter(Boolean).length;

  // ── Narrative depth ────────────────────────────────────────────────────────
  let narrativeDepth = 0;
  if (wordCount > 20) narrativeDepth += 20;
  if (wordCount > 100) narrativeDepth += 20;
  if (wordCount > 300) narrativeDepth += 20;
  if (wordCount > 600) narrativeDepth += 20;
  if (/born|birth|grew up|childhood|young|early life/i.test(allText)) narrativeDepth += 10;
  if (/married|spouse|husband|wife|partner|family/i.test(allText)) narrativeDepth += 10;
  if (/work|career|job|profession|built|created|founded/i.test(allText)) narrativeDepth += 10;
  if (/passed|died|death|memorial|funeral|legacy/i.test(allText)) narrativeDepth += 10;
  narrativeDepth = Math.min(100, narrativeDepth);

  // ── Sensory grounding ──────────────────────────────────────────────────────
  let sensoryGrounding = 0;
  if (photoCount >= 1) sensoryGrounding += 30;
  if (photoCount >= 3) sensoryGrounding += 20;
  if (photoCount >= 7) sensoryGrounding += 20;
  if (photoFacts.length > 0) sensoryGrounding += 15;
  if (/smell|sound|feel|touch|color|colour|wore|hair|eyes|hands/i.test(allText)) sensoryGrounding += 15;
  if (/house|home|kitchen|garden|farm|workshop|office/i.test(allText)) sensoryGrounding += 10;
  sensoryGrounding = Math.min(100, sensoryGrounding);

  // ── Voice / personality ────────────────────────────────────────────────────
  let voicePersonality = 0;
  if (transcript.trim().length > 50) voicePersonality += 40; // voice recording is gold
  if (/always said|used to say|would say|favorite|loved|hated|never|always/i.test(allText)) voicePersonality += 20;
  if (/laugh|smile|joke|funny|humor|quirk|habit/i.test(allText)) voicePersonality += 20;
  if (/believed|faith|valued|cared|passionate|dedicated/i.test(allText)) voicePersonality += 20;
  voicePersonality = Math.min(100, voicePersonality);

  // ── Factual anchors ────────────────────────────────────────────────────────
  let factualAnchors = 0;
  if (/\b(19|20)\d{2}\b/.test(allText)) factualAnchors += 25; // year mentioned
  if (photoFacts.some(f => /\d{4}|jersey|school|team/.test(f))) factualAnchors += 25;
  if (importedTexts.length > 0) factualAnchors += 25; // obituary/document
  if (/born in|from|grew up in|lived in|moved to/i.test(allText)) factualAnchors += 15;
  if (allText.length > 0 && subject && new RegExp(subject.split(' ')[0], 'i').test(allText)) factualAnchors += 10;
  factualAnchors = Math.min(100, factualAnchors);

  // ── Overall + gap ──────────────────────────────────────────────────────────
  const overallScore = Math.round(
    narrativeDepth * 0.35 +
    sensoryGrounding * 0.25 +
    voicePersonality * 0.25 +
    factualAnchors * 0.15
  );

  const gaps = {
    narrative: 100 - narrativeDepth,
    sensory: 100 - sensoryGrounding,
    voice: 100 - voicePersonality,
    factual: 100 - factualAnchors,
  };
  const dominantGap = (Object.entries(gaps).sort((a, b) => b[1] - a[1])[0][0]) as IntakeAssessment['dominantGap'];
  const readyToCreate = overallScore >= 35; // enough to make something real

  return {
    narrativeDepth,
    sensoryGrounding,
    voicePersonality,
    factualAnchors,
    overallScore,
    readyToCreate,
    dominantGap: overallScore >= 80 ? 'none' : dominantGap,
    inputTypes: {
      hasPhotos: photoCount > 0,
      hasText: wordCount > 30,
      hasVoice: transcript.trim().length > 50,
      hasDocuments: importedTexts.length > 0,
      hasScans: importedTexts.some(t => t.name.startsWith('Scan:')),
    },
  };
}

// ─── Connie suggestion via Supabase (NOT direct Anthropic call) ───────────────

async function fetchConnieSuggestionFromSupabase(
  subject: string,
  assessment: IntakeAssessment,
  quickNote: string,
  petMode: boolean
): Promise<ConnieSuggestion> {
  const { inputTypes, dominantGap, overallScore, readyToCreate } = assessment;

  // Build a context-aware system prompt
  const systemPrompt = `You are Connie — a warm, unhurried, deeply compassionate memory curator for Story Scribe.
Your single purpose right now is to help this family give ${subject}'s story the richness it deserves.
You speak like a trusted friend who is also an expert at drawing out memories — never clinical, never rushed.

The family is on the gathering screen. Based on what they've provided, you will offer ONE specific, warm suggestion.

What they've provided:
- Photos: ${inputTypes.hasPhotos ? assessment.sensoryGrounding + '/100 richness' : 'none yet'}
- Written content: ${inputTypes.hasText ? 'yes (' + Math.round(quickNote.split(/\s+/).length) + ' words)' : 'none yet'}
- Voice recording: ${inputTypes.hasVoice ? 'yes — powerful' : 'not yet'}
- Documents: ${inputTypes.hasDocuments ? 'yes' : 'none'}
${petMode ? 'This is a PET tribute — the bond between a person and their animal companion.' : ''}

Overall readiness: ${overallScore}/100
Biggest gap: ${dominantGap}
Ready to create: ${readyToCreate}

You must respond with ONLY valid JSON — no markdown, no preamble:
{
  "type": "greeting" | "followup" | "missing" | "opening" | "ready",
  "text": "your warm message — 1-2 sentences max, specific to what they've shared",
  "appendText": "a gentle follow-up question to add if type=followup (optional)"
}

Rules:
- If overallScore < 20 and nothing provided: type=greeting, welcome them warmly
- If hasPhotos but no text: ask about the era or what was happening then
- If hasText but no photos: ask if they have any photos they could share
- If hasVoice: acknowledge the recording warmly, it means a lot
- If dominantGap=voice and no voice: gently invite them to talk to Connie
- If dominantGap=sensory: ask for one specific physical detail (hands, kitchen smell, favorite chair)
- If dominantGap=narrative: ask about one life chapter that's missing
- If readyToCreate and overallScore > 60: celebrate what they've shared and say you're ready
- NEVER ask multiple questions. ONE gentle nudge only.
- NEVER be clinical. NEVER say "data" or "input" or "content".
- Speak as if you already know and love this person.`;

  try {
    const res = await fetch(CASCADE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'connie_chat',
        system_prompt: systemPrompt,
        subject,
        messages: quickNote.trim()
          ? [{ role: 'user', parts: [{ text: quickNote.trim() }] }]
          : [],
      }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    const raw = (data.text || '').replace(/```json\s*/gi, '').replace(/```/gi, '').trim();
    if (!raw) throw new Error('empty');
    return JSON.parse(raw);
  } catch {
    // Graceful fallback — never show an error to the user
    return getFallbackSuggestion(assessment, subject, petMode);
  }
}

function getFallbackSuggestion(
  assessment: IntakeAssessment,
  subject: string,
  petMode: boolean
): ConnieSuggestion {
  const name = subject || (petMode ? 'your companion' : 'them');
  if (assessment.overallScore < 15) {
    return {
      type: 'greeting',
      text: `I'm here to help preserve ${name}'s story. Tell me anything — even one memory is a place to begin.`,
    };
  }
  if (!assessment.inputTypes.hasPhotos) {
    return {
      type: 'missing',
      text: `Do you have any photos of ${name}? Even one old photo helps me paint the right picture.`,
    };
  }
  if (assessment.dominantGap === 'voice') {
    return {
      type: 'followup',
      text: `What's one thing ${name} always said? A phrase, a habit, something only the family would know.`,
    };
  }
  if (assessment.dominantGap === 'sensory') {
    return {
      type: 'followup',
      text: `What did ${name}'s world look like — the house, the smells, the sounds? Take me there.`,
    };
  }
  if (assessment.readyToCreate) {
    return {
      type: 'ready',
      text: `You've given me everything I need. I'm ready to weave ${name}'s story into something the family will treasure.`,
    };
  }
  return {
    type: 'followup',
    text: `What's the one thing about ${name} that everyone who knew them would immediately recognize?`,
    appendText: 'What made them irreplaceable?',
  };
}

// ─── Score bar component ──────────────────────────────────────────────────────

const ScoreBar: React.FC<{ label: string; score: number; color: string }> = ({ label, score, color }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 9, fontFamily: 'system-ui', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.5 }}>{label}</span>
      <span style={{ fontSize: 9, fontFamily: 'system-ui', fontWeight: 700, opacity: 0.4 }}>{score}</span>
    </div>
    <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${score}%`,
        borderRadius: 2,
        background: color,
        transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const IntakeAgent: React.FC<IntakeAgentProps & {
  quickNote: string;
  onTalkToConnie: () => void;
  onSuggestionApply?: (appendText: string) => void;
}> = ({
  subject, transcript, photoCount, photoFacts, importedTexts,
  petMode = false, quickNote, onTalkToConnie, onSuggestionApply,
  onConnnieSuggestionReady, onReadyToCreate,
}) => {
  const [assessment, setAssessment] = useState<IntakeAssessment | null>(null);
  const [suggestion, setSuggestion] = useState<ConnieSuggestion | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAssessmentRef = useRef('');

  // Recompute assessment whenever inputs change
  useEffect(() => {
    const a = assessIntake({ subject, transcript, photoCount, photoFacts, importedTexts, petMode });
    setAssessment(a);

    // Key for change detection
    const key = `${quickNote.length}-${photoCount}-${transcript.length}-${importedTexts.length}`;
    if (key === lastAssessmentRef.current) return;
    lastAssessmentRef.current = key;

    // Reset dismissed state when content changes significantly
    if (quickNote.length % 50 === 0 || photoCount > 0) setDismissed(false);

    // Debounce suggestion fetch
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(async () => {
      if (dismissed) return;
      setIsFetching(true);
      const s = await fetchConnieSuggestionFromSupabase(subject, a, quickNote, petMode);
      setSuggestion(s);
      if (onConnnieSuggestionReady) onConnnieSuggestionReady(s);
      if (s.type === 'ready' && a.readyToCreate && onReadyToCreate) onReadyToCreate();
      setIsFetching(false);
    }, quickNote.length > 30 ? 2500 : 800);

    return () => { if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current); };
  }, [subject, transcript, photoCount, photoFacts.length, importedTexts.length, quickNote, petMode]);

  if (!assessment) return null;

  const { overallScore, readyToCreate, narrativeDepth, sensoryGrounding, voicePersonality, factualAnchors } = assessment;

  // Color based on readiness
  const accentColor = readyToCreate
    ? 'rgba(196,151,59,0.9)'   // gold — ready
    : overallScore > 50
    ? 'rgba(74,222,128,0.7)'    // green — good progress
    : 'rgba(255,255,255,0.4)';  // neutral — keep going

  return (
    <div style={{
      marginBottom: 24,
      borderRadius: 20,
      border: `1px solid ${readyToCreate ? 'rgba(196,151,59,0.3)' : 'rgba(255,255,255,0.08)'}`,
      background: readyToCreate ? 'rgba(196,151,59,0.05)' : 'rgba(255,255,255,0.03)',
      overflow: 'hidden',
      transition: 'all 0.4s ease',
    }}>

      {/* ── Connie header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 20px 14px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img
            src="https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/connie-ai.png"
            alt="Connie"
            style={{
              width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
              border: `2px solid ${accentColor}`,
              transition: 'border-color 0.4s',
            }}
          />
          {isFetching && (
            <div style={{
              position: 'absolute', inset: -2, borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: accentColor,
              animation: 'spin 1s linear infinite',
            }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontFamily: 'system-ui', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', color: accentColor }}>
              Connie
            </span>
            {readyToCreate && (
              <span style={{ fontSize: 9, fontFamily: 'system-ui', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: 'rgba(196,151,59,0.15)', color: 'rgba(196,151,59,0.9)', border: '1px solid rgba(196,151,59,0.3)' }}>
                Ready
              </span>
            )}
          </div>

          {/* Connie's message */}
          {suggestion && !dismissed ? (
            <div>
              <p style={{ fontSize: 14, fontStyle: 'italic', lineHeight: 1.5, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
                "{suggestion.text}"
              </p>
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {suggestion.type === 'followup' && suggestion.appendText && onSuggestionApply && (
                  <button
                    onClick={() => { onSuggestionApply(suggestion.appendText!); setDismissed(true); }}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 11,
                      fontFamily: 'system-ui', fontWeight: 700, letterSpacing: '0.15em',
                      textTransform: 'uppercase', cursor: 'pointer',
                      background: 'rgba(196,151,59,0.12)', color: 'rgba(196,151,59,0.9)',
                      border: '1px solid rgba(196,151,59,0.25)', transition: 'all 0.2s',
                    }}
                  >
                    Add this question
                  </button>
                )}
                {(suggestion.type === 'followup' || suggestion.type === 'missing') && (
                  <button
                    onClick={onTalkToConnie}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 11,
                      fontFamily: 'system-ui', fontWeight: 700, letterSpacing: '0.15em',
                      textTransform: 'uppercase', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s',
                    }}
                  >
                    🎙 Talk to Connie
                  </button>
                )}
                <button
                  onClick={() => setDismissed(true)}
                  style={{
                    padding: '6px 10px', borderRadius: 20, fontSize: 11,
                    fontFamily: 'system-ui', fontWeight: 500, cursor: 'pointer',
                    background: 'transparent', color: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.2s',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : isFetching ? (
            <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              Connie is reading what you've shared...
            </p>
          ) : (
            <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              {subject ? `I'm here to help preserve ${subject}'s story.` : 'I\'m here whenever you\'re ready.'}
            </p>
          )}
        </div>

        {/* Expand/collapse scores */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.3)', fontSize: 10, transition: 'all 0.2s',
          }}
          title="Story readiness"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* ── Overall progress bar ── */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${overallScore}%`,
            borderRadius: 2,
            background: readyToCreate
              ? 'linear-gradient(90deg, rgba(196,151,59,0.6), rgba(196,151,59,0.9))'
              : 'linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.35))',
            transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 9, fontFamily: 'system-ui', opacity: 0.3, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Story readiness</span>
          <span style={{ fontSize: 9, fontFamily: 'system-ui', opacity: 0.3 }}>{overallScore}/100</span>
        </div>
      </div>

      {/* ── Expanded dimension scores ── */}
      {expanded && (
        <div style={{
          padding: '12px 20px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: 12,
        }}>
          <ScoreBar label="Story" score={narrativeDepth} color="rgba(196,151,59,0.7)" />
          <ScoreBar label="Visual" score={sensoryGrounding} color="rgba(96,165,250,0.7)" />
          <ScoreBar label="Voice" score={voicePersonality} color="rgba(167,139,250,0.7)" />
          <ScoreBar label="Facts" score={factualAnchors} color="rgba(74,222,128,0.7)" />
        </div>
      )}

      {/* ── Input type indicators ── */}
      <div style={{
        padding: '10px 20px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', gap: 8, flexWrap: 'wrap',
      }}>
        {[
          { key: 'hasPhotos', label: `${photoCount} photo${photoCount !== 1 ? 's' : ''}`, icon: '📷', active: assessment.inputTypes.hasPhotos },
          { key: 'hasText', label: 'Written', icon: '✍️', active: assessment.inputTypes.hasText },
          { key: 'hasVoice', label: 'Voice', icon: '🎙', active: assessment.inputTypes.hasVoice },
          { key: 'hasDocuments', label: 'Documents', icon: '📄', active: assessment.inputTypes.hasDocuments },
          { key: 'hasScans', label: 'Scanned', icon: '🖨️', active: assessment.inputTypes.hasScans },
        ].map(({ key, label, icon, active }) => (
          <div
            key={key}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20,
              background: active ? 'rgba(196,151,59,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? 'rgba(196,151,59,0.25)' : 'rgba(255,255,255,0.07)'}`,
              transition: 'all 0.3s',
            }}
          >
            <span style={{ fontSize: 11 }}>{icon}</span>
            <span style={{
              fontSize: 10, fontFamily: 'system-ui', fontWeight: active ? 700 : 400,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: active ? 'rgba(196,151,59,0.8)' : 'rgba(255,255,255,0.2)',
            }}>{label}</span>
            {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(196,151,59,0.7)', flexShrink: 0 }} />}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default IntakeAgent;
