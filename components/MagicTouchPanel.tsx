import React, { useState } from 'react';

interface MagicTouchPanelProps {
  onRefine: (instruction: string) => void;
  isProcessing: boolean;
}

const REFINEMENTS = [
  { emoji: '💫', label: 'More Emotional',  instruction: 'Rewrite the narrative to be more emotional and moving. Go deeper into feelings, longing, and the emotional truth of this life. Make people cry in the best way.' },
  { emoji: '📚', label: 'More Detail',     instruction: 'Expand the narrative with more descriptive details — sensory language, specific moments, textures of daily life. Make the scenes vivid and immersive.' },
  { emoji: '⚡', label: 'More Concise',    instruction: 'Tighten the narrative. Remove anything repetitive. Every sentence should earn its place. Make it lean and powerful.' },
  { emoji: '🎭', label: 'More Dramatic',   instruction: 'Raise the dramatic stakes. Stronger verbs, more vivid imagery, more tension and release. Make it feel like a story worth telling from a mountaintop.' },
  { emoji: '🔥', label: 'Oral Tradition',  instruction: 'Rewrite as a master storyteller speaking aloud — around a fire, passing this story to grandchildren. Use "she used to say..." and "the family always remembered..."' },
  { emoji: '🌀', label: 'Non-Linear',      instruction: 'Restructure so it moves through time the way memory does — not chronologically, but emotionally. Begin near the end, weave back. Let a single object connect decades.' },
  { emoji: '✍️', label: 'More Poetic',     instruction: 'Rewrite with lyrical beauty. Use metaphor, rhythm, and imagery. Let the language itself feel like a gift — every sentence worth reading twice.' },
  { emoji: '💌', label: 'More Intimate',   instruction: 'Make it feel like a private letter to the family — close, personal, warm. Write as though speaking directly to those who loved this person most.' },
];

const MagicTouchPanel: React.FC<MagicTouchPanelProps> = ({ onRefine, isProcessing }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleClick = (instruction: string, label: string) => {
    setSelected(label);
    onRefine(instruction);
  };

  return (
    <div style={{
      background: 'rgba(33,26,19,0.8)',
      border: '1px solid rgba(196,151,59,0.2)',
      borderRadius: 20,
      padding: '24px 24px 20px',
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>✨</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C4973B' }}>
            Magic Touch
          </div>
          <div style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(255,248,235,0.4)', marginTop: 1 }}>
            Reshape the story with one tap
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {REFINEMENTS.map(r => {
          const isActive = selected === r.label && isProcessing;
          return (
            <button key={r.label} onClick={() => handleClick(r.instruction, r.label)} disabled={isProcessing}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 12, textAlign: 'left',
                border: `1px solid ${isActive ? 'rgba(196,151,59,0.5)' : 'rgba(255,248,235,0.08)'}`,
                background: isActive ? 'rgba(196,151,59,0.12)' : 'rgba(255,248,235,0.04)',
                cursor: isProcessing ? 'wait' : 'pointer',
                opacity: isProcessing && !isActive ? 0.5 : 1,
                transition: 'all 0.2s',
              }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{r.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                color: isActive ? '#C4973B' : 'rgba(255,248,235,0.65)' }}>
                {isActive ? 'Rewriting...' : r.label}
              </span>
            </button>
          );
        })}
      </div>

      {isProcessing && (
        <div style={{ marginTop: 14, height: 2, background: 'rgba(255,248,235,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #C4973B, #E8A24A)', animation: 'magicSlide 1.5s ease-in-out infinite' }} />
          <style>{`@keyframes magicSlide{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
        </div>
      )}
    </div>
  );
};

export default MagicTouchPanel;
