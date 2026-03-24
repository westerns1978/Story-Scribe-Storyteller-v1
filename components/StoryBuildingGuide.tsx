// components/StoryBuildingGuide.tsx
// ============================================
// Guided story building prompts for Story Scribe
// Surfaces the specific, irreplaceable details that make goosebumps moments possible.
// Used in GatheringScreen — opens as a slide-up panel when user needs help.
// Organized by life chapter. Tap a question → appends to the story text area.
// ============================================

import React, { useState, useCallback } from 'react';

// ─── Data ────────────────────────────────────────────────────────────────────

interface Chapter {
  id: string;
  chapter: string;
  emoji: string;
  color: string;
  questions: string[];
  goosebumps_prompt: string;
}

// Safe hex to rgba helper
function hexToRgba(hex: string, alpha: number): string {
  const parts = hex.replace('#', '').match(/.{2}/g);
  if (!parts || parts.length < 3) return `rgba(196,151,59,${alpha})`;
  const [r, g, b] = parts.map(h => parseInt(h, 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

const CHAPTERS: Chapter[] = [
  {
    id: 'roots',
    chapter: 'Roots & Childhood',
    emoji: '🌱',
    color: '#6B8E7A',
    questions: [
      'What did their home smell like growing up?',
      'Who was the character in the family — the one everyone tells stories about?',
      'What was the first hard thing they ever faced?',
      'What did they do with their hands as a child? Always making or fixing something?',
      'What was the sound of their childhood — a radio station, a particular voice, a neighborhood noise?',
      'What did they want to be when they grew up?',
    ],
    goosebumps_prompt: 'What is ONE thing about their childhood that only your family would know — so specific it could only be them?',
  },
  {
    id: 'becoming',
    chapter: 'Who They Became',
    emoji: '🔥',
    color: '#C4973B',
    questions: [
      'When did they stop becoming and start being — what was that moment?',
      'What were they genuinely the BEST at? Not just good — the person people called?',
      'What did they work at that most people never saw?',
      'What failure shaped them more than any success?',
      'Who believed in them before they believed in themselves?',
      'What did they choose that surprised everyone?',
    ],
    goosebumps_prompt: 'What is something they could do that no one else you know can do — a skill, a sense, a way of being in the world?',
  },
  {
    id: 'love',
    chapter: 'Love & Family',
    emoji: '❤️',
    color: '#8B2E3B',
    questions: [
      'How did they show love — not what they said, but what they actually did?',
      'What did they do every single day without fail?',
      'What did they make — food, objects, traditions — that the family still makes today?',
      'What phrase or saying did they repeat so often it became part of the family language?',
      'Who did they love in a way that surprised you?',
      'What argument or difficulty became the story the family now tells with love?',
    ],
    goosebumps_prompt: 'What is the one specific gesture, phrase, or ritual that was completely theirs — that you will miss most?',
  },
  {
    id: 'work',
    chapter: 'Work & Purpose',
    emoji: '⚒️',
    color: '#5C4A1A',
    questions: [
      'What did they do for work — and what did it mean to them?',
      'What were they quietly proud of that they never talked about?',
      'What did their hands look like at the end of a workday?',
      'What did they do that felt like purpose rather than just a job?',
      'Who did their work help that they never met?',
      'What did they build or create that still exists somewhere in the world?',
    ],
    goosebumps_prompt: 'What is one thing they made, built, or accomplished that will outlast all of us?',
  },
  {
    id: 'later',
    chapter: 'Later Years',
    emoji: '🌅',
    color: '#A07830',
    questions: [
      'What did they get better at as they got older?',
      'What did they let go of that they\'d been carrying too long?',
      'What were they still curious about near the end?',
      'What did they say that you\'ll never forget?',
      'What do you know now about them that you wish you\'d asked about sooner?',
      'What was the last ordinary moment with them you now understand was extraordinary?',
    ],
    goosebumps_prompt: 'What is the last thing they said or did that you didn\'t know would be the last — but now you\'re glad you noticed?',
  },
];

const PET_CHAPTER: Chapter = {
  id: 'pet',
  chapter: 'Their Life With You',
  emoji: '🐾',
  color: '#A07830',
  questions: [
    'What did they do every single day — a route, a ritual, a spot?',
    'How did they greet you? What was the specific thing they always did?',
    'Who were they closest to in the family — and how did they show it?',
    'What made them different from every other animal you\'ve known?',
    'What did they seem to understand that surprised you?',
    'What is the funniest or most ridiculous thing they ever did?',
  ],
  goosebumps_prompt: 'What is the ONE thing they did that no other animal does — the behavior so specific it was completely, irreplaceably theirs?',
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const BG = '#0D0B0A';
const CREAM = 'rgba(245,236,215,0.9)';
const DIM = 'rgba(245,236,215,0.4)';
const FAINT = 'rgba(245,236,215,0.06)';

// ─── Main Component ───────────────────────────────────────────────────────────

interface StoryBuildingGuideProps {
  subject: string;
  petMode?: boolean;
  onAppendText: (text: string) => void;
  onClose: () => void;
}

export const StoryBuildingGuide: React.FC<StoryBuildingGuideProps> = ({
  subject,
  petMode = false,
  onAppendText,
  onClose,
}) => {
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());

  const chapters = petMode ? [PET_CHAPTER] : CHAPTERS;
  const active = chapters.find(c => c.id === activeChapter);

  const handleUseQuestion = useCallback((question: string) => {
    // Append as a labeled prompt in the text
    const formatted = `\n\n${question}\n`;
    onAppendText(formatted);
    setUsedQuestions(prev => new Set([...prev, question]));
  }, [onAppendText]);

  const handleGoosebumps = useCallback((prompt: string) => {
    const formatted = `\n\n✦ ${prompt}\n`;
    onAppendText(formatted);
    setUsedQuestions(prev => new Set([...prev, prompt]));
  }, [onAppendText]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(8,6,4,0.92)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 560,
        background: BG,
        border: '1px solid rgba(196,151,59,0.2)',
        borderRadius: '20px 20px 0 0',
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -24px 64px rgba(0,0,0,0.6)',
      }}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Header */}
        <div style={{
          padding: '12px 24px 16px',
          borderBottom: `1px solid ${FAINT}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontSize: 9, fontWeight: 900, letterSpacing: '.4em',
              textTransform: 'uppercase', color: 'rgba(196,151,59,0.5)',
              fontFamily: 'system-ui', marginBottom: 3,
            }}>Story Scribe</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: CREAM }}>
              {activeChapter
                ? active?.chapter
                : `What made ${subject || 'them'} irreplaceable?`}
            </div>
          </div>
          <button
            onClick={activeChapter ? () => setActiveChapter(null) : onClose}
            style={{ background: 'none', border: 'none', color: DIM, fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui', fontWeight: 900, letterSpacing: '.1em' }}
          >
            {activeChapter ? '← Back' : '✕ Close'}
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px 32px' }}>

          {!activeChapter ? (
            // Chapter selection
            <>
              <p style={{
                fontFamily: 'Georgia, serif', fontStyle: 'italic',
                fontSize: 14, color: DIM, lineHeight: 1.6,
                marginBottom: 20,
              }}>
                The best stories come from specific details — not what made them good, but what made them irreplaceable. Choose a chapter to find those details.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chapters.map(chapter => (
                  <button
                    key={chapter.id}
                    onClick={() => setActiveChapter(chapter.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 18px', borderRadius: 14,
                      background: FAINT,
                      border: `1px solid rgba(255,255,255,0.06)`,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all .15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = `rgba(196,151,59,0.06)`;
                      e.currentTarget.style.borderColor = `rgba(196,151,59,0.2)`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = FAINT;
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{chapter.emoji}</span>
                    <div>
                      <div style={{
                        fontFamily: 'Georgia, serif', fontSize: 15, color: CREAM,
                        marginBottom: 2,
                      }}>
                        {chapter.chapter}
                      </div>
                      <div style={{
                        fontSize: 10, color: DIM, fontFamily: 'system-ui',
                      }}>
                        {chapter.questions.length} questions →
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Quick goosebumps question */}
              <div style={{
                marginTop: 20, padding: '16px 18px', borderRadius: 14,
                background: 'rgba(196,151,59,0.06)',
                border: '1px solid rgba(196,151,59,0.2)',
              }}>
                <div style={{
                  fontSize: 8, fontWeight: 900, letterSpacing: '.4em',
                  textTransform: 'uppercase', color: 'rgba(196,151,59,0.5)',
                  fontFamily: 'system-ui', marginBottom: 10,
                }}>
                  ✦ The Most Important Question
                </div>
                <p style={{
                  fontFamily: 'Georgia, serif', fontStyle: 'italic',
                  fontSize: 14, color: CREAM, lineHeight: 1.6, marginBottom: 12,
                }}>
                  What is the one thing about {subject || 'them'} that no one else in the world does — the detail so specific it could only be them?
                </p>
                <button
                  onClick={() => handleGoosebumps(`What is the one thing about ${subject || 'them'} that no one else in the world does — the detail so specific it could only be them?`)}
                  style={{
                    padding: '8px 16px', borderRadius: 100,
                    background: 'rgba(196,151,59,0.15)',
                    border: '1px solid rgba(196,151,59,0.3)',
                    color: '#C4973B', fontSize: 10, fontWeight: 900,
                    letterSpacing: '.2em', textTransform: 'uppercase',
                    cursor: 'pointer', fontFamily: 'system-ui',
                  }}
                >
                  Add to Story →
                </button>
              </div>
            </>
          ) : active ? (
            // Questions for selected chapter
            <>
              <p style={{
                fontFamily: 'Georgia, serif', fontStyle: 'italic',
                fontSize: 13, color: DIM, lineHeight: 1.6,
                marginBottom: 20,
              }}>
                Tap any question to add it to your story. Answer it there — Connie will weave your answer into the narrative.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {active.questions.map((q, i) => {
                  const used = usedQuestions.has(q);
                  return (
                    <button
                      key={i}
                      onClick={() => !used && handleUseQuestion(q)}
                      style={{
                        padding: '14px 16px', borderRadius: 12,
                        background: used ? 'rgba(74,222,128,0.04)' : FAINT,
                        border: `1px solid ${used ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)'}`,
                        cursor: used ? 'default' : 'pointer',
                        textAlign: 'left', transition: 'all .15s',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                      }}
                      onMouseEnter={e => {
                        if (!used) {
                          e.currentTarget.style.background = `rgba(196,151,59,0.06)`;
                          e.currentTarget.style.borderColor = `rgba(196,151,59,0.2)`;
                        }
                      }}
                      onMouseLeave={e => {
                        if (!used) {
                          e.currentTarget.style.background = FAINT;
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        }
                      }}
                    >
                      <span style={{
                        fontSize: 10, color: used ? '#4ade80' : 'rgba(196,151,59,0.4)',
                        flexShrink: 0, paddingTop: 2, fontFamily: 'system-ui', fontWeight: 900,
                      }}>
                        {used ? '✓' : '→'}
                      </span>
                      <span style={{
                        fontFamily: 'Georgia, serif', fontStyle: 'italic',
                        fontSize: 14, color: used ? DIM : CREAM,
                        lineHeight: 1.5,
                        textDecoration: used ? 'line-through' : 'none',
                      }}>
                        {q}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Chapter goosebumps */}
              <div style={{
                padding: '16px 18px', borderRadius: 14,
                background: hexToRgba(active.color, 0.08),
                border: `1px solid ${hexToRgba(active.color, 0.2)}`,
              }}>
                <div style={{
                  fontSize: 8, fontWeight: 900, letterSpacing: '.4em',
                  textTransform: 'uppercase', color: active.color,
                  fontFamily: 'system-ui', marginBottom: 8, opacity: 0.7,
                }}>
                  ✦ The Goosebumps Question
                </div>
                <p style={{
                  fontFamily: 'Georgia, serif', fontStyle: 'italic',
                  fontSize: 14, color: CREAM, lineHeight: 1.6, marginBottom: 12,
                }}>
                  {active.goosebumps_prompt}
                </p>
                <button
                  onClick={() => handleGoosebumps(active.goosebumps_prompt)}
                  disabled={usedQuestions.has(active.goosebumps_prompt)}
                  style={{
                    padding: '8px 16px', borderRadius: 100,
                    background: usedQuestions.has(active.goosebumps_prompt)
                      ? 'rgba(74,222,128,0.08)'
                      : hexToRgba(active.color, 0.15),
                    border: `1px solid ${hexToRgba(active.color, 0.3)}`,
                    color: usedQuestions.has(active.goosebumps_prompt) ? '#4ade80' : active.color,
                    fontSize: 10, fontWeight: 900,
                    letterSpacing: '.2em', textTransform: 'uppercase',
                    cursor: usedQuestions.has(active.goosebumps_prompt) ? 'default' : 'pointer',
                    fontFamily: 'system-ui',
                  }}
                >
                  {usedQuestions.has(active.goosebumps_prompt) ? '✓ Added' : 'Add to Story →'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default StoryBuildingGuide;
