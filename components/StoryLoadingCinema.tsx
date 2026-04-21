import React, { useEffect, useState, useRef } from 'react';
import { BRAND } from '../utils/brandUtils';
import { formatDisplayName } from '../utils/nameUtils';

// ── Curated quotes — grief, memory, legacy, the irreplaceable ──────────────
const QUOTES = [
  {
    text: "All those moments will be lost in time, like tears in rain.",
    attr: "Roy Batty · Blade Runner, 1982",
    mood: "loss",
  },
  {
    text: "You forget what you want to remember, and you remember what you want to forget.",
    attr: "Cormac McCarthy · The Road",
    mood: "memory",
  },
  {
    text: "The world will never starve for want of wonders; but only for want of wonder.",
    attr: "G.K. Chesterton",
    mood: "wonder",
  },
  {
    text: "In the end, it's not the years in your life that count. It's the life in your years.",
    attr: "Abraham Lincoln",
    mood: "life",
  },
  {
    text: "A life is not important except in the impact it has on other lives.",
    attr: "Jackie Robinson",
    mood: "impact",
  },
  {
    text: "She was a girl who knew how to be happy even when she was sad. And that's important.",
    attr: "Marilyn Monroe",
    mood: "resilience",
  },
  {
    text: "To live in hearts we leave behind is not to die.",
    attr: "Thomas Campbell · Hallowed Ground, 1825",
    mood: "legacy",
  },
  {
    text: "What we have once enjoyed we can never lose. All that we love deeply becomes a part of us.",
    attr: "Helen Keller",
    mood: "love",
  },
  {
    text: "The bitterest tears shed over graves are for words left unsaid and deeds left undone.",
    attr: "Harriet Beecher Stowe",
    mood: "grief",
  },
  {
    text: "The most precious things in life are not those you got for money.",
    attr: "Albert Einstein",
    mood: "value",
  },
  {
    text: "There is no greater agony than bearing an untold story inside you.",
    attr: "Maya Angelou",
    mood: "story",
  },
  {
    text: "Every man's life ends the same way. It is only the details of how he lived and how he died that distinguish one man from another.",
    attr: "Ernest Hemingway",
    mood: "legacy",
  },
  {
    text: "We shall not cease from exploration, and the end of all our exploring will be to arrive where we started and know the place for the first time.",
    attr: "T.S. Eliot",
    mood: "journey",
  },
  {
    text: "Grief is the price we pay for love.",
    attr: "Queen Elizabeth II",
    mood: "grief",
  },
  {
    text: "Those we love don't go away, they walk beside us every day, unseen, unheard, but always near, still loved, still missed and very dear.",
    attr: "Anonymous",
    mood: "presence",
  },
];

// ── Warm cinematic background images (Unsplash public) ────────────────────
const IMAGES = [
  'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=1200&q=75', // old letters/hands
  'https://images.unsplash.com/photo-1499810631641-541e76d678a2?w=1200&q=75', // golden light
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // warm landscape
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=75', // family warmth
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=75', // misty forest
  'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1200&q=75', // golden hour
];

const QUOTE_DURATION = 8000; // ms per quote
const IMAGE_DURATION = 10000; // ms per image

const STAGE_LABELS = [
  'Reading memories\u2026',
  'Mapping the timeline\u2026',
  'Painting the scenes\u2026',
  'Directing the final cut\u2026',
];

interface Props {
  storytellerName?: string;
  progressStage?: number;  // 0-3 matching agent steps
}

const StoryLoadingCinema: React.FC<Props> = ({ storytellerName, progressStage }) => {
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [imageIdx, setImageIdx] = useState(() => Math.floor(Math.random() * IMAGES.length));
  const [quoteVisible, setQuoteVisible] = useState(true);
  const [imageVisible, setImageVisible] = useState(true);
  const [dotsCount, setDotsCount] = useState(1);
  const quoteTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const imageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotsTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rotate quotes with crossfade
  useEffect(() => {
    quoteTimer.current = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIdx(prev => (prev + 1) % QUOTES.length);
        setQuoteVisible(true);
      }, 800);
    }, QUOTE_DURATION);
    return () => { if (quoteTimer.current) clearInterval(quoteTimer.current); };
  }, []);

  // Rotate images with crossfade
  useEffect(() => {
    imageTimer.current = setInterval(() => {
      setImageVisible(false);
      setTimeout(() => {
        setImageIdx(prev => (prev + 1) % IMAGES.length);
        setImageVisible(true);
      }, 1200);
    }, IMAGE_DURATION);
    return () => { if (imageTimer.current) clearInterval(imageTimer.current); };
  }, []);

  // Animate loading dots
  useEffect(() => {
    dotsTimer.current = setInterval(() => {
      setDotsCount(prev => prev >= 3 ? 1 : prev + 1);
    }, 500);
    return () => { if (dotsTimer.current) clearInterval(dotsTimer.current); };
  }, []);

  const quote = QUOTES[quoteIdx];
  const dots = '.'.repeat(dotsCount);

  const name = storytellerName && storytellerName !== 'Unknown'
    ? (formatDisplayName(storytellerName) || storytellerName)
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: '#08060A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes kb-cinema {
          0% { transform: scale(1.0); }
          100% { transform: scale(1.08); }
        }
        @keyframes cinema-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes quote-rise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cinema-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.04); }
        }
      `}</style>

      {/* Background image — Ken Burns */}
      <div style={{
        position: 'absolute', inset: '-5%',
        opacity: imageVisible ? 1 : 0,
        transition: 'opacity 1.2s ease-in-out',
        animation: 'kb-cinema 10s ease-out forwards',
      }}>
        <img
          src={IMAGES[imageIdx]}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'sepia(35%) brightness(0.45) contrast(1.1) saturate(0.8)',
          }}
          alt=""
        />
      </div>

      {/* Layered overlays */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 15%, rgba(4,2,8,0.88) 100%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(8,4,2,0.7) 0%, transparent 25%, transparent 65%, rgba(4,2,8,0.95) 100%)',
      }} />
      {/* Amber hearth glow from below */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 35% at 50% 115%, rgba(196,151,59,0.12) 0%, transparent 60%)',
      }} />

      {/* Top — Wissums wordmark */}
      <div style={{
        position: 'absolute', top: 36, left: 0, right: 0,
        textAlign: 'center',
        animation: 'cinema-fade-in 1s ease both',
      }}>
        <span style={{
          fontSize: 9, fontWeight: 900, letterSpacing: '0.5em',
          textTransform: 'uppercase', color: 'rgba(196,151,59,0.45)',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>{BRAND.name}</span>
      </div>

      {/* Center — Quote */}
      <div style={{
        position: 'relative', zIndex: 10,
        maxWidth: 560, padding: '0 32px',
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      }}>
        {/* Gold decorative line */}
        <div style={{
          width: 40, height: 1,
          background: 'linear-gradient(to right, transparent, rgba(196,151,59,0.6), transparent)',
          marginBottom: 4,
        }} />

        {/* Quote text */}
        <div style={{
          opacity: quoteVisible ? 1 : 0,
          transform: quoteVisible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}>
          <p style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(16px, 3.5vw, 22px)',
            fontWeight: 400,
            color: 'rgba(245,236,215,0.82)',
            lineHeight: 1.65,
            letterSpacing: '0.01em',
            margin: '0 0 16px',
          }}>
            "{quote.text}"
          </p>
          <p style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(196,151,59,0.55)',
            margin: 0,
          }}>
            — {quote.attr}
          </p>
        </div>

        {/* Gold decorative line */}
        <div style={{
          width: 40, height: 1,
          background: 'linear-gradient(to right, transparent, rgba(196,151,59,0.6), transparent)',
          marginTop: 4,
        }} />
      </div>

      {/* Bottom — Loading status with progress */}
      <div style={{
        position: 'absolute', bottom: 52, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        animation: 'cinema-fade-in 1.5s ease both',
      }}>
        {/* Progress bar — real stage progress */}
        <div style={{
          width: 200, height: 2,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 1, overflow: 'hidden', marginBottom: 4,
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(to right, rgba(196,151,59,0.5), rgba(196,151,59,0.9))',
            width: progressStage != null ? `${Math.min(100, ((progressStage + 1) / 4) * 100)}%` : '10%',
            transition: 'width 1.2s ease-in-out',
            borderRadius: 1,
          }} />
        </div>

        {/* Stage label */}
        {progressStage != null && (
          <p style={{
            fontFamily: '"Helvetica Neue", Arial, sans-serif',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'rgba(196,151,59,0.6)',
            margin: 0,
            transition: 'opacity 0.5s ease',
          }}>
            Step {progressStage + 1} of 4
          </p>
        )}

        <p style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontStyle: 'italic',
          fontSize: 13,
          color: 'rgba(245,236,215,0.45)',
          letterSpacing: '0.08em',
          margin: 0,
          minHeight: 20,
          transition: 'opacity 0.5s ease',
        }}>
          {progressStage != null
            ? STAGE_LABELS[progressStage] || `Preparing ${name ? name + "'s" : 'your'} story${dots}`
            : name
              ? `Preparing ${name}'s story${dots}`
              : `Preparing your story${dots}`
          }
        </p>

        <p style={{
          fontFamily: '"Helvetica Neue", Arial, sans-serif',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          color: 'rgba(196,151,59,0.25)',
          margin: 0,
        }}>
          Made with love by {BRAND.name}
        </p>
      </div>
    </div>
  );
};

export default StoryLoadingCinema;
