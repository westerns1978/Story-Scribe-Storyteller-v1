import React, { useState, useEffect } from 'react';
import { isWissums, BRAND, WISSUMS_BG, WISSUMS_PORTRAIT } from '../utils/brandUtils';

interface WissumsLandingProps {
  onSelectTier: (tier: 'basic' | 'premium') => void;
  isLoading?: boolean;
  onDemoMode?: () => void;
}

const EXAMPLE_PETS = [
  {
    name: 'Porky',
    type: 'Bearded Dragon',
    quote: '"He\'d close his eyes when you rubbed under his chin — this tiny dinosaur who trusted you completely."',
    sessionId: '265c587f-7803-4410-926d-2298af9c4642',
    emoji: '\uD83E\uDD8E',
    color: 'rgba(196,151,59,0.2)',
  },
  {
    name: 'Pork Chop',
    type: 'Beloved Companion',
    quote: '"Some souls are too big for one lifetime. Pork Chop lived like every day was a gift — because to us, it was."',
    sessionId: '79438cba-0274-4552-8469-06aaaf3015b6',
    emoji: '\uD83D\uDC3E',
    color: 'rgba(139,46,59,0.2)',
  },
];

export const WissumsLanding: React.FC<WissumsLandingProps> = ({ onSelectTier, isLoading, onDemoMode }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 1400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'auto',
      background: '#08060A',
      color: '#F5ECD7',
    }}>
      <style>{`
        @keyframes wl-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wl-breathe {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%     { opacity: 0.8; transform: scale(1.04); }
        }
        @keyframes wl-float {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-8px); }
        }
        .wl-up1 { animation: wl-up .8s cubic-bezier(.16,1,.3,1) both; }
        .wl-up2 { animation: wl-up .8s cubic-bezier(.16,1,.3,1) .2s both; }
        .wl-up3 { animation: wl-up .8s cubic-bezier(.16,1,.3,1) .4s both; }
        .wl-up4 { animation: wl-up .8s cubic-bezier(.16,1,.3,1) .6s both; }
      `}</style>

      {/* Atmospheric background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <img src={WISSUMS_BG} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 110% 50% at 50% 110%, rgba(196,151,59,0.08) 0%, rgba(139,46,59,0.05) 40%, transparent 65%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 45%, rgba(4,2,6,0.7) 100%)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 640, margin: '0 auto', padding: '48px 24px 64px' }}>

        {/* Portrait + Wordmark */}
        <div className="wl-up1" style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ width: 240, height: 240, borderRadius: '50%', margin: '0 auto 16px', overflow: 'hidden', border: '2px solid rgba(196,151,59,0.3)', boxShadow: '0 0 60px rgba(196,151,59,0.4), 0 8px 30px rgba(0,0,0,0.6)' }}>
            <img src={WISSUMS_PORTRAIT} alt={BRAND.agentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ height: 1, width: 32, background: 'rgba(196,151,59,0.25)' }} />
            <span style={{
              fontSize: 10, fontWeight: 900, letterSpacing: '0.5em', textTransform: 'uppercase',
              color: 'rgba(196,151,59,0.5)', fontFamily: 'Georgia, serif',
            }}>
              Wissums
            </span>
            <div style={{ height: 1, width: 32, background: 'rgba(196,151,59,0.25)' }} />
          </div>
        </div>

        {/* Hero */}
        <div className="wl-up2" style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 900, fontSize: 'clamp(2rem, 7vw, 3.2rem)',
            lineHeight: 1.12, letterSpacing: '-0.02em',
            margin: '0 0 20px',
          }}>
            Preserve your pet's<br />
            <em style={{ color: 'rgba(196,151,59,0.8)', fontStyle: 'italic' }}>story</em> forever.
          </h1>
          <p style={{
            fontFamily: 'Georgia, serif', fontStyle: 'italic',
            color: 'rgba(245,236,215,0.45)', fontSize: '1rem',
            lineHeight: 1.7, margin: '0 0 28px', maxWidth: 460, marginLeft: 'auto', marginRight: 'auto',
          }}>
            {BRAND.agentName} will guide you through a short interview. In minutes,
            you'll have a beautiful cinematic story to share with family and friends.
          </p>
        </div>

        {/* Connie quote */}
        <div className="wl-up3" style={{
          textAlign: 'center', marginBottom: 48,
          padding: '24px 28px', borderRadius: 16,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(196,151,59,0.15)',
        }}>
          <div style={{ fontSize: 28, lineHeight: 1, color: 'rgba(139,46,59,0.4)', fontFamily: 'Georgia, serif', marginBottom: 8 }}>"</div>
          <p style={{
            fontFamily: 'Georgia, serif', fontStyle: 'italic',
            color: 'rgba(245,236,215,0.6)', fontSize: '0.95rem',
            lineHeight: 1.7, margin: '0 0 12px',
          }}>
            Hi! I'm {BRAND.agentName}. Tell me about your pet &mdash; their name, their personality,
            their funny habits. Let's preserve their story forever.
          </p>
          <span style={{
            fontSize: 9, fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase',
            color: 'rgba(196,151,59,0.35)',
          }}>
            &mdash; {BRAND.agentName}, your story guide
          </span>
        </div>

        {/* Pricing buttons */}
        <div className="wl-up3" style={{ marginBottom: 56 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 380, margin: '0 auto' }}>

            {/* Basic */}
            <button
              onClick={() => !isLoading && onSelectTier('basic')}
              disabled={isLoading}
              style={{
                width: '100%', padding: '22px 24px', borderRadius: 20,
                background: 'linear-gradient(145deg, #9B3548 0%, #8B2E3B 55%, #7A1F2E 100%)',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 16px 48px rgba(139,46,59,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
                color: 'white', cursor: isLoading ? 'wait' : 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all .25s ease', opacity: isLoading ? 0.6 : 1,
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Basic Story
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                  Cinematic story + shareable link
                </div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 24, fontFamily: 'Georgia, serif' }}>$19</div>
            </button>

            {/* Premium */}
            <button
              onClick={() => !isLoading && onSelectTier('premium')}
              disabled={isLoading}
              style={{
                width: '100%', padding: '22px 24px', borderRadius: 20,
                background: 'linear-gradient(145deg, rgba(196,151,59,0.2), rgba(196,151,59,0.08))',
                border: '1.5px solid rgba(196,151,59,0.4)',
                boxShadow: '0 16px 48px rgba(196,151,59,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
                color: 'white', cursor: isLoading ? 'wait' : 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all .25s ease', opacity: isLoading ? 0.6 : 1,
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Full Memory Book
                  <span style={{
                    fontSize: 8, fontWeight: 900, letterSpacing: '0.2em',
                    background: 'rgba(196,151,59,0.3)', color: 'rgba(196,151,59,1)',
                    padding: '3px 8px', borderRadius: 6,
                  }}>BEST VALUE</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                  Everything + MP4 movie + PDF memory book
                </div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 24, fontFamily: 'Georgia, serif', color: 'rgba(196,151,59,0.9)' }}>$49</div>
            </button>
          </div>
          {isWissums && onDemoMode && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                onClick={onDemoMode}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontFamily: 'Georgia, serif', fontStyle: 'italic',
                  color: 'rgba(196,151,59,0.45)',
                  transition: 'color .2s',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(196,151,59,0.8)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(196,151,59,0.45)'}
              >
                <span style={{ fontSize: 10 }}>▶</span> See a Demo Story
              </button>
            </div>
          )}
          {!isWissums && (
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                onClick={() => onSelectTier('basic')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, fontFamily: 'Georgia, serif', fontStyle: 'italic',
                  color: 'rgba(245,236,215,0.25)', textDecoration: 'underline',
                  transition: 'color .2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(245,236,215,0.5)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,236,215,0.25)'}
              >
                Skip — Demo Mode
              </button>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="wl-up4" style={{ marginBottom: 56 }}>
          <h2 style={{
            textAlign: 'center', fontFamily: 'Georgia, serif', fontWeight: 700,
            fontSize: '1.1rem', color: 'rgba(245,236,215,0.5)', marginBottom: 28,
            letterSpacing: '0.05em',
          }}>
            How it works
          </h2>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { step: '1', title: 'Choose your plan', desc: 'Basic story or full memory book', icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C10.34 2 9 3.34 9 5C9 6.66 10.34 8 12 8C13.66 8 15 6.66 15 5C15 3.34 13.66 2 12 2ZM5.5 5C4.12 5 3 6.12 3 7.5C3 8.88 4.12 10 5.5 10C6.88 10 8 8.88 8 7.5C8 6.12 6.88 5 5.5 5ZM18.5 5C17.12 5 16 6.12 16 7.5C16 8.88 17.12 10 18.5 10C19.88 10 21 8.88 21 7.5C21 6.12 19.88 5 18.5 5ZM12 10C9.79 10 8 12.24 8 15C8 17 9.5 22 12 22C14.5 22 16 17 16 15C16 12.24 14.21 10 12 10ZM5 12C3.34 12 2 13.79 2 16C2 17.5 3 20 5 20C7 20 8 17.5 8 16C8 15.26 7.83 14.57 7.54 13.97C6.76 12.76 5.96 12 5 12ZM19 12C18.04 12 17.24 12.76 16.46 13.97C16.17 14.57 16 15.26 16 16C16 17.5 17 20 19 20C21 20 22 17.5 22 16C22 13.79 20.66 12 19 12Z" fill="#C4973B"/>
                </svg>
              )},
              { step: '2', title: `Talk to ${BRAND.agentName}`, desc: 'Share memories of your pet', icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14ZM17.3 11C17.3 14 14.76 16.1 12 16.1C9.24 16.1 6.7 14 6.7 11H5C5 14.41 7.72 17.23 11 17.72V21H13V17.72C16.28 17.23 19 14.41 19 11H17.3Z" fill="#C4973B"/>
                </svg>
              )},
              { step: '3', title: 'Get your story', desc: 'Cinematic tribute in minutes', icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 5V19L19 12L8 5Z" fill="#C4973B"/>
                  <rect x="2" y="3" width="20" height="18" rx="3" stroke="#C4973B" strokeWidth="1.5" fill="none"/>
                </svg>
              )},
            ].map(item => (
              <div key={item.step} style={{
                flex: '1 1 160px', maxWidth: 200, textAlign: 'center', padding: '20px 16px',
                background: 'rgba(255,255,255,0.025)', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
                <div style={{ fontWeight: 900, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(196,151,59,0.6)', marginBottom: 6 }}>
                  Step {item.step}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'rgba(245,236,215,0.8)', marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(245,236,215,0.35)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Example pet stories */}
        <div className="wl-up4" style={{ marginBottom: 48 }}>
          <h2 style={{
            textAlign: 'center', fontFamily: 'Georgia, serif', fontWeight: 700,
            fontSize: '1.1rem', color: 'rgba(245,236,215,0.5)', marginBottom: 24,
            letterSpacing: '0.05em',
          }}>
            Stories we've preserved
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {EXAMPLE_PETS.map(pet => (
              <div key={pet.name} style={{
                padding: '20px 24px', borderRadius: 14,
                background: pet.color, border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', gap: 16, alignItems: 'flex-start',
              }}>
                <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>{pet.emoji}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14, color: 'rgba(245,236,215,0.9)', marginBottom: 2 }}>
                    {pet.name}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(196,151,59,0.5)', marginBottom: 8 }}>
                    {pet.type}
                  </div>
                  <p style={{
                    fontFamily: 'Georgia, serif', fontStyle: 'italic',
                    fontSize: 13, color: 'rgba(245,236,215,0.55)', lineHeight: 1.65, margin: '0 0 12px',
                  }}>
                    {pet.quote}
                  </p>
                  <a
                    href={`https://gen-lang-client-0121881478.web.app/?story=${pet.sessionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase',
                      color: '#C4973B', textDecoration: 'none',
                      padding: '6px 14px', borderRadius: 12,
                      background: 'rgba(196,151,59,0.1)', border: '1px solid rgba(196,151,59,0.25)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(196,151,59,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(196,151,59,0.1)'; }}
                  >
                    Watch Story →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{
            fontFamily: 'Georgia, serif', fontStyle: 'italic',
            fontSize: 12, color: 'rgba(245,236,215,0.22)', lineHeight: 1.6,
          }}>
            Made with love for the pets who made us better humans.
          </p>
          <p style={{
            fontSize: 8, fontWeight: 900, letterSpacing: '0.45em', textTransform: 'uppercase',
            color: 'rgba(196,151,59,0.2)', marginTop: 12,
          }}>
            Wissums &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WissumsLanding;
