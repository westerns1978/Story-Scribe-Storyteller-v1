import React, { useState, useEffect } from 'react';
import { isWissums, BRAND, CONNIE_PORTRAIT } from '../../utils/brandUtils';
import { formatDisplayName } from '../../utils/nameUtils';

interface WelcomeScreenProps {
  activeStoryName?: string;
  onReturnToStory?: () => void;
  onBegin: (name: string, language: string, narratorVoice: string, petMode?: boolean, persona?: 'curator' | 'keeper' | 'pet') => void;
  onTalkToConnie?: () => void;
  onUploadMemories?: () => void;
  onLogout: () => void;
  onViewStory?: (sessionId: string) => void;
  onViewShelf?: () => void;
  savedStories?: { sessionId: string; storytellerName: string; savedAt: string }[];
  storiesLoading?: boolean;
  onLogoTap?: () => void;
  initialName?: string;
  // Auth props — all optional, safe if not passed
  supabaseUser?: { id: string; email: string; display_name?: string } | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

type Persona = 'curator' | 'keeper' | 'subject' | 'pet' | null;

const CONNIE_IMG = CONNIE_PORTRAIT;

const LANGUAGES = [
  { code: 'en', native: 'English' }, { code: 'es', native: 'Español' },
  { code: 'fr', native: 'Français' }, { code: 'zh', native: '中文' },
  { code: 'vi', native: 'Tiếng Việt' }, { code: 'ko', native: '한국어' },
  { code: 'tl', native: 'Tagalog' }, { code: 'hi', native: 'हिन्दी' },
  { code: 'af', native: 'Afrikaans' },
];

const HINTS = ['Grandma Rose…', 'Uncle Joe…', 'Mom…', 'Dad…', 'Auntie Mae…', 'Grandpa Bill…', 'Nana…'];
const PET_HINTS = ['Buddy…', 'Bella…', 'Max…', 'Luna…', 'Charlie…', 'Daisy…', 'Ellie…'];

// Wissums persona cards
const WISSUMS_PERSONAS = [
  {
    id: 'pet' as Persona,
    icon: '🐾',
    title: 'Quick Pet Story',
    badge: 'QUICK',
    tagline: 'A story in minutes.',
    description: `Upload a photo or write a few sentences about your pet. ${BRAND.agentName} crafts a cinematic tribute — images, timeline, music — in under 2 minutes.`,
    useCases: ['Dogs & cats', 'Quick tributes', 'Share with family'],
    color: '#C4973B',
    glow: 'rgba(196,151,59,0.15)',
    border: 'rgba(196,151,59,0.3)',
  },
  {
    id: 'keeper' as Persona,
    icon: '📖',
    title: 'Full Pet Story',
    badge: 'FULL',
    tagline: 'Build it chapter by chapter.',
    description: `Interview with ${BRAND.agentName}. Add photos, share your favorite memories. Build a complete story of your pet's life that lasts forever.`,
    useCases: ['Dogs, cats, horses', 'Family pet history', 'Memory book'],
    color: '#8B2E3B',
    glow: 'rgba(139,46,59,0.15)',
    border: 'rgba(139,46,59,0.35)',
  },
  {
    id: 'subject' as Persona,
    icon: '🎙️',
    title: `Talk to ${BRAND.agentName}`,
    badge: 'VOICE',
    tagline: 'Just talk. She does the rest.',
    description: `${BRAND.agentName} listens, asks playful questions, and quietly builds your pet's story in the background. Perfect for when you just want to share memories.`,
    useCases: ['Voice-first', 'Easy sharing', 'All pets'],
    color: '#6B8E7A',
    glow: 'rgba(107,142,122,0.15)',
    border: 'rgba(107,142,122,0.3)',
  },
];

// Story Scribe persona cards
const SCRIBE_PERSONAS = [
  {
    id: 'curator' as Persona,
    icon: '✨',
    title: 'Quick Story',
    badge: 'QUICK',
    tagline: 'A story in minutes.',
    description: `Upload a photo or write a few sentences. ${BRAND.agentName} crafts a cinematic story in under 2 minutes.`,
    useCases: ['Family tributes', 'Quick stories', 'Share with family'],
    color: '#C4973B',
    glow: 'rgba(196,151,59,0.15)',
    border: 'rgba(196,151,59,0.3)',
  },
  {
    id: 'keeper' as Persona,
    icon: '📖',
    title: 'Full Biography',
    badge: 'FULL',
    tagline: 'Build it chapter by chapter.',
    description: `Interview with ${BRAND.agentName}. Build a complete life story with chapters, timeline, and memory book.`,
    useCases: ['Life stories', 'Family history', 'Memory book'],
    color: '#8B2E3B',
    glow: 'rgba(139,46,59,0.15)',
    border: 'rgba(139,46,59,0.35)',
  },
  {
    id: 'subject' as Persona,
    icon: '🎙️',
    title: `Talk to ${BRAND.agentName}`,
    badge: 'VOICE',
    tagline: 'Just speak. She does the rest.',
    description: `Just speak — she'll ask the right questions and build the story.`,
    useCases: ['Voice-first', 'Easy sharing', 'All stories'],
    color: '#6B8E7A',
    glow: 'rgba(107,142,122,0.15)',
    border: 'rgba(107,142,122,0.3)',
  },
];

const PERSONAS = isWissums ? WISSUMS_PERSONAS : SCRIBE_PERSONAS;

// ── Field Guide Modal ─────────────────────────────────────────────────────────
const FieldGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}
    onClick={onClose}
  >
    <div
      style={{
        width: '100%', maxWidth: 760, maxHeight: '88vh',
        background: 'linear-gradient(160deg, #1A1208 0%, #0D0B0A 100%)',
        border: '1px solid rgba(196,151,59,0.2)',
        borderRadius: 28, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{
        padding: '24px 28px 20px',
        borderBottom: '1px solid rgba(196,151,59,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '.4em', textTransform: 'uppercase', color: 'rgba(196,151,59,0.5)', marginBottom: 4 }}>
            {BRAND.name}
          </div>
          <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: '1.3rem', color: 'rgba(245,236,215,0.9)' }}>
            Field Guide
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(245,236,215,0.4)', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 40px' }}>

        <Section title="📜 Conversation Guide" color="#C4973B">
          <p style={bodyStyle}>A guide, not a rigid script. The goal is to spark memories and facilitate natural storytelling.</p>
          <Label>Opening Script</Label>
          <Blockquote>
            "Hi [Name], I'm here because your stories matter, and we want to help preserve them for your family.
            We'll use our conversation to create something beautiful — like a digital storybook with pictures and your voice.
            Would you like to start with something that makes you smile?"
          </Blockquote>
          <Label>Core Question Categories</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {[
              ['Childhood & Family', 'Tell me about the house you grew up in. / Who was the "character" in your family?'],
              ['Coming of Age', 'What was happening in the world when you were 18? / Tell me about your first job or first car.'],
              ['Life Milestones', 'How did you meet your spouse? / What was the biggest change you lived through?'],
              ['Wisdom & Legacy', 'What advice would you give your younger self? / What are you most grateful for?'],
            ].map(([cat, q]) => (
              <div key={cat} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(196,151,59,0.1)' }}>
                <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.25em', textTransform: 'uppercase', color: 'rgba(196,151,59,0.6)', marginBottom: 4 }}>{cat}</div>
                <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(245,236,215,0.55)', lineHeight: 1.5 }}>{q}</div>
              </div>
            ))}
          </div>
          <Label>Session Management</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['When tired', '"You\'re sharing wonderful memories. Should we pause here and continue another time?"'],
              ['When emotional', '"These memories are precious. Take your time. It sounds like that was very important to you."'],
              ['When memory is fragmented', '"Even those small flashes are meaningful. Tell me what you do remember — any detail."'],
            ].map(([when, script]) => (
              <div key={when} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.2em', textTransform: 'uppercase', color: '#8B2E3B', flexShrink: 0, paddingTop: 2 }}>{when}</div>
                <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(245,236,215,0.5)', lineHeight: 1.5 }}>{script}</div>
              </div>
            ))}
          </div>
        </Section>

        <Divider />

        <Section title="🏥 Care Facility Guide" color="#8B2E3B">
          <p style={bodyStyle}>Use this strategy to introduce {BRAND.name} to care facilities and senior living communities.</p>
          <Label>Value Proposition</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              ['Family Engagement', 'Increases family satisfaction by creating a powerful, positive touchpoint.'],
              ['Resident Wellbeing', 'Leverages the therapeutic benefits of reminiscence therapy.'],
              ['Marketing Differentiation', 'Offers a unique, high-value service that sets a facility apart.'],
              ['Staff Efficiency', `Structured activity with minimal staff overhead — ${BRAND.name} handles the technology.`],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(139,46,59,0.06)', border: '1px solid rgba(139,46,59,0.12)' }}>
                <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.15em', textTransform: 'uppercase', color: 'rgba(139,46,59,0.7)', flexShrink: 0, paddingTop: 2, minWidth: 130 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'rgba(245,236,215,0.5)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
          <Label>Director Approach Script</Label>
          <Blockquote>
            "I'd like to propose a program that creates lasting digital storybooks from your residents' life stories.
            This addresses three key challenges: keeping residents engaged, helping families feel connected, and providing
            a unique value that families remember when choosing care. The program requires minimal staff time —
            we handle the technical work, and families receive something they'll keep forever."
          </Blockquote>
          <Label>Handling Objections</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['On Dementia', '"Our approach is adaptive. Even fragmented memories can be woven into meaningful content. The process itself has therapeutic value."'],
              ['On Staff Time', '"I handle the technical work. Your staff\'s time is minimal — this program actually helps engage residents deeply."'],
              ['On Privacy', '"We require explicit family consent. The resident is always in control of what\'s shared and what remains private."'],
              ['On Cost', '"Pilot with 5 residents at no cost. We only charge when families are seeing results they love."'],
            ].map(([obj, resp]) => (
              <div key={obj} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(196,151,59,0.5)', flexShrink: 0, paddingTop: 2, minWidth: 80 }}>{obj}</div>
                <div style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(245,236,215,0.5)', lineHeight: 1.5 }}>{resp}</div>
              </div>
            ))}
          </div>
        </Section>

        <Divider />

        <Section title="💰 Pricing" color="#6B8E7A">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Pilot', 'Free', '5 residents, testimonials only'],
              ['Per Story', '$49–$79', 'One-time family fee'],
              ['Facility Monthly', '$299–$599', 'Unlimited stories, white-label'],
              ['Enterprise', 'Custom', 'Multi-facility, API access'],
            ].map(([tier, price, desc]) => (
              <div key={tier} style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(107,142,122,0.06)', border: '1px solid rgba(107,142,122,0.12)' }}>
                <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '.3em', textTransform: 'uppercase', color: 'rgba(107,142,122,0.6)', marginBottom: 4 }}>{tier}</div>
                <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: '1.1rem', color: 'rgba(245,236,215,0.85)', marginBottom: 3 }}>{price}</div>
                <div style={{ fontSize: 11, color: 'rgba(245,236,215,0.35)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  </div>
);

const Section: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: '1rem', color: 'rgba(245,236,215,0.8)', marginBottom: 16 }}>{title}</div>
    {children}
  </div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '.4em', textTransform: 'uppercase', color: 'rgba(196,151,59,0.4)', marginBottom: 8, marginTop: 16 }}>{children}</div>
);

const Blockquote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    padding: '14px 18px', borderRadius: 12, marginBottom: 16,
    background: 'rgba(196,151,59,0.05)',
    borderLeft: '2px solid rgba(196,151,59,0.3)',
  }}>
    <p style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 14, color: 'rgba(245,236,215,0.6)', lineHeight: 1.6, margin: 0 }}>{children}</p>
  </div>
);

const Divider: React.FC = () => (
  <div style={{ height: 1, background: 'rgba(196,151,59,0.1)', margin: '24px 0' }} />
);

const bodyStyle: React.CSSProperties = {
  fontSize: 13, color: 'rgba(245,236,215,0.45)', lineHeight: 1.6, marginBottom: 14, fontFamily: 'Georgia,serif', fontStyle: 'italic',
};

// ── Main Component ────────────────────────────────────────────────────────────
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onBegin, onTalkToConnie, onLogout, onViewStory, onViewShelf,
  savedStories = [], storiesLoading = false, onLogoTap,
  activeStoryName, onReturnToStory, initialName,
  supabaseUser, onSignIn, onSignOut,
}) => {
  const [persona, setPersona] = useState<Persona>(null);
  const [name, setName] = useState(initialName || '');
  const [language, setLanguage] = useState('en');
  const [voice, setVoice] = useState<string>('Kore');
  const [showOpts, setShowOpts] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const [hintFade, setHintFade] = useState(true);
  const [in_, setIn] = useState(false);
  const [showFieldGuide, setShowFieldGuide] = useState(false);

  useEffect(() => { setTimeout(() => setIn(true), 60); }, []);

  useEffect(() => {
    if (name) return;
    const id = setInterval(() => {
      setHintFade(false);
      setTimeout(() => { setHintIdx(i => (i + 1) % HINTS.length); setHintFade(true); }, 350);
    }, 3000);
    return () => clearInterval(id);
  }, [name]);

  const can = name.trim().length > 0;

  const handlePersonaSelect = (p: Persona) => {
    if (p === 'subject') { onTalkToConnie?.(); return; }
    setPersona(p);
  };

  const handleGo = () => { if (!can) return; onBegin(name.trim(), language, voice, persona === 'pet', persona || 'curator'); };

  const footerBtnStyle = (color = 'rgba(255,255,255,0.1)'): React.CSSProperties => ({
    fontSize: 8, fontWeight: 900, letterSpacing: '.3em', textTransform: 'uppercase',
    color, background: 'none', border: 'none', cursor: 'pointer', transition: 'color .2s',
    padding: '4px 0',
  });

  return (
    <div style={{
      height: '100%', width: '100%', overflowY: 'auto',
      background: '#080604', position: 'relative',
      opacity: in_ ? 1 : 0, transition: 'opacity .4s ease',
    }}>
      <style>{`
        @keyframes ws-breathe { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:.8;transform:scale(1.08)} }
        @keyframes ws-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes ws-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }
        .r1{animation:ws-up .65s cubic-bezier(.16,1,.3,1) .05s both}
        .r2{animation:ws-up .65s cubic-bezier(.16,1,.3,1) .15s both}
        .r3{animation:ws-up .65s cubic-bezier(.16,1,.3,1) .26s both}
        .r4{animation:ws-up .65s cubic-bezier(.16,1,.3,1) .38s both}
        .r5{animation:ws-up .65s cubic-bezier(.16,1,.3,1) .50s both}
        .r6{animation:ws-up .65s cubic-bezier(.16,1,.3,1) .62s both}
        .persona-card { cursor:pointer; transition:all 0.3s cubic-bezier(.16,1,.3,1); border-radius:20px; padding:24px; text-align:left; width:100%; position:relative; overflow:hidden; }
        .persona-card:hover { transform:translateY(-3px); }
        .ws-input { width:100%; box-sizing:border-box; background:rgba(255,255,255,0.04); border:1.5px solid rgba(196,151,59,0.18); border-radius:16px; padding:18px 22px; font-family:Georgia,serif; font-style:italic; font-size:1.15rem; color:rgba(245,236,215,0.9); text-align:center; outline:none; transition:border-color .2s,background .2s; caret-color:#C4973B; }
        .ws-input:focus{border-color:rgba(196,151,59,0.45);background:rgba(255,255,255,0.06)}
        .ws-input::placeholder{color:rgba(245,236,215,0.2)}
        .ws-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; transition:background .15s,border-color .15s; width:100%; text-align:left; }
        .ws-card:hover{background:rgba(245,158,11,0.06);border-color:rgba(245,158,11,0.2)}
        .ws-pill { padding:6px 13px; border-radius:100px; font-size:10px; font-weight:900; letter-spacing:.05em; text-transform:uppercase; background:rgba(255,255,255,0.05); color:rgba(245,236,215,0.4); border:1.5px solid transparent; cursor:pointer; transition:all .15s; }
        .ws-pill:hover{color:rgba(245,236,215,.7);background:rgba(245,158,11,.1)}
        .ws-pill.on{background:rgba(196,151,59,.15);color:#C4973B;border-color:rgba(196,151,59,.35)}
        .ws-vbtn { flex:1; padding:14px 12px; border-radius:14px; background:rgba(255,255,255,0.03); border:1.5px solid rgba(255,255,255,0.08); text-align:center; cursor:pointer; transition:all .2s; }
        .ws-vbtn:hover{background:rgba(255,255,255,0.06)}
        .ws-vbtn.her{border-color:rgba(139,46,59,.5);background:rgba(139,46,59,.08)}
        .ws-vbtn.his{border-color:rgba(92,74,26,.5);background:rgba(92,74,26,.08)}
        .fg-btn:hover { color: rgba(245,158,11,0.7) !important; }
      `}</style>

      {/* Crown glow */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'55%', pointerEvents:'none', background:'radial-gradient(ellipse 70% 55% at 50% -5%, rgba(139,46,59,0.18) 0%, transparent 70%)' }} />

      <div style={{ position:'relative', zIndex:10, maxWidth:480, margin:'0 auto', padding:'48px 24px 64px', display:'flex', flexDirection:'column', alignItems:'center' }}>

        {/* Signed-in user pill — only shows if supabaseUser is set */}
        {supabaseUser && (
          <div style={{ width:'100%', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10 }}>
            <span style={{ fontSize:9, fontWeight:900, letterSpacing:'.25em', textTransform:'uppercase', color:'rgba(196,151,59,0.5)' }}>
              {supabaseUser.display_name || supabaseUser.email}
            </span>
            {onSignOut && (
              <button onClick={onSignOut} style={{ fontSize:8, fontWeight:900, letterSpacing:'.25em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', background:'none', border:'none', cursor:'pointer', padding:0 }}
                onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.45)'}
                onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.2)'}
              >sign out</button>
            )}
          </div>
        )}

        {/* Return to active story */}
        {activeStoryName && onReturnToStory && (
          <div className="r1" style={{ width:'100%', marginBottom:20 }}>
            <button onClick={onReturnToStory} style={{ width:'100%', padding:'14px 20px', borderRadius:14, background:'rgba(196,151,59,0.08)', border:'1px solid rgba(196,151,59,0.25)', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', transition:'background .2s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(196,151,59,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(196,151,59,0.08)'}
            >
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:8, fontWeight:900, letterSpacing:'.4em', textTransform:'uppercase', color:'rgba(196,151,59,0.5)', marginBottom:4 }}>Continue</div>
                <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'.95rem', color:'rgba(245,236,215,0.75)' }}>{formatDisplayName(activeStoryName) || activeStoryName}'s Story</div>
              </div>
              <span style={{ color:'rgba(196,151,59,0.5)', fontSize:'1rem' }}>▶ Resume</span>
            </button>
          </div>
        )}

        {/* Connie */}
        <div className="r1" style={{ textAlign:'center', marginBottom:32 }} onClick={onLogoTap}>
          <div style={{ position:'relative', display:'inline-block', marginBottom:16 }}>
            <div style={{ position:'absolute', inset:-24, borderRadius:'50%', background:'radial-gradient(circle, rgba(196,151,59,0.14) 0%, transparent 70%)', animation:'ws-breathe 4s ease-in-out infinite' }} />
            <div style={{ width:96, height:96, borderRadius:'50%', border:'1.5px solid rgba(196,151,59,0.3)', boxShadow:'0 0 48px rgba(196,151,59,0.1), 0 8px 30px rgba(0,0,0,0.6)', overflow:'hidden', position:'relative', background:'rgba(30,12,16,0.9)' }}>
              <img src={CONNIE_IMG} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt={BRAND.agentName} />
            </div>
          </div>
          <p style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontWeight:400, fontSize:'1.25rem', color:'rgba(245,236,215,0.8)', margin:'0 0 4px', letterSpacing:'.02em' }}>Their story deserves</p>
          <p style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontWeight:700, fontSize:'1.5rem', color:'#C4973B', margin:0 }}>to live forever.</p>
        </div>

        {/* PERSONA SELECTION or NAME INPUT */}
        {!persona ? (
          isWissums ? (
            /* ── Wissums: persona picker cards ── */
            <>
              <div className="r2" style={{ width:'100%', marginBottom:8, textAlign:'center' }}>
                <p style={{ fontSize:8, fontWeight:900, letterSpacing:'.44em', textTransform:'uppercase', color:'rgba(196,151,59,0.4)', marginBottom:10 }}>How will you use {BRAND.name}?</p>
              </div>
              <div className="r3" style={{ width:'100%', display:'flex', flexDirection:'column', gap:12, marginBottom:32 }}>
                {PERSONAS.map((p, i) => (
                  <button key={p.id} className="persona-card" onClick={() => handlePersonaSelect(p.id)}
                    style={{ background:`linear-gradient(135deg, ${p.glow}, rgba(255,255,255,0.02))`, border:`1px solid ${p.border}`, animationDelay:`${0.1+i*0.1}s` }}
                  >
                    <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
                      <div style={{ width:48, height:48, borderRadius:14, flexShrink:0, background:p.glow, border:`1px solid ${p.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{p.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <span style={{ fontFamily:'Georgia,serif', fontWeight:700, fontSize:'1rem', color:'rgba(245,236,215,0.9)' }}>{p.title}</span>
                          <span style={{ fontSize:8, fontWeight:900, letterSpacing:'.3em', textTransform:'uppercase', color:p.color, background:p.glow, border:`1px solid ${p.border}`, padding:'2px 7px', borderRadius:4 }}>{p.badge}</span>
                        </div>
                        <p style={{ fontSize:12, fontStyle:'italic', fontFamily:'Georgia,serif', color:'rgba(245,236,215,0.5)', margin:'0 0 10px', lineHeight:1.5 }}>{p.description}</p>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {p.useCases.map(uc => <span key={uc} style={{ fontSize:9, fontWeight:700, letterSpacing:'.2em', textTransform:'uppercase', color:p.color, opacity:0.7 }}>· {uc}</span>)}
                        </div>
                      </div>
                      <div style={{ color:p.color, opacity:0.5, fontSize:18, flexShrink:0, marginTop:4 }}>→</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* ── Story Scribe: three cards (Quick Story, Full Biography, Talk to Connie) ── */
            <>
              <div className="r2" style={{ width:'100%', marginBottom:8, textAlign:'center' }}>
                <p style={{ fontSize:8, fontWeight:900, letterSpacing:'.44em', textTransform:'uppercase', color:'rgba(196,151,59,0.4)', marginBottom:10 }}>How would you like to begin?</p>
              </div>
              <div className="r3" style={{ width:'100%', display:'flex', flexDirection:'column', gap:12, marginBottom:32 }}>
                {PERSONAS.map((p, i) => (
                  <button key={p.id} className="persona-card" onClick={() => handlePersonaSelect(p.id)}
                    style={{ background:`linear-gradient(135deg, ${p.glow}, rgba(255,255,255,0.02))`, border:`1px solid ${p.border}`, animationDelay:`${0.1+i*0.1}s` }}
                  >
                    <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
                      <div style={{ width:48, height:48, borderRadius:14, flexShrink:0, background:p.glow, border:`1px solid ${p.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{p.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <span style={{ fontFamily:'Georgia,serif', fontWeight:700, fontSize:'1rem', color:'rgba(245,236,215,0.9)' }}>{p.title}</span>
                          <span style={{ fontSize:8, fontWeight:900, letterSpacing:'.3em', textTransform:'uppercase', color:p.color, background:p.glow, border:`1px solid ${p.border}`, padding:'2px 7px', borderRadius:4 }}>{p.badge}</span>
                        </div>
                        <p style={{ fontSize:12, fontStyle:'italic', fontFamily:'Georgia,serif', color:'rgba(245,236,215,0.5)', margin:'0 0 10px', lineHeight:1.5 }}>{p.description}</p>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {p.useCases.map(uc => <span key={uc} style={{ fontSize:9, fontWeight:700, letterSpacing:'.2em', textTransform:'uppercase', color:p.color, opacity:0.7 }}>· {uc}</span>)}
                        </div>
                      </div>
                      <div style={{ color:p.color, opacity:0.5, fontSize:18, flexShrink:0, marginTop:4 }}>→</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )
        ) : (
          <>
            <div className="r2" style={{ width:'100%', marginBottom:20 }}>
              <button onClick={() => setPersona(null)} style={{ background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontSize:9, fontWeight:900, letterSpacing:'.3em', textTransform:'uppercase', color:'rgba(245,236,215,0.25)', padding:'4px 0', transition:'color .2s' }}
                onMouseEnter={e => e.currentTarget.style.color='rgba(245,236,215,0.5)'}
                onMouseLeave={e => e.currentTarget.style.color='rgba(245,236,215,0.25)'}
              >← Back</button>
            </div>

            <div className="r2" style={{ width:'100%', marginBottom:20 }}>
              {(() => {
                const p = PERSONAS.find(p => p.id === persona)!;
                return (
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:14, background:p.glow, border:`1px solid ${p.border}` }}>
                    <span style={{ fontSize:20 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontSize:8, fontWeight:900, letterSpacing:'.35em', textTransform:'uppercase', color:p.color, marginBottom:2 }}>{p.badge}</div>
                      <div style={{ fontFamily:'Georgia,serif', fontSize:'.9rem', color:'rgba(245,236,215,0.7)', fontStyle:'italic' }}>{p.tagline}</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="r3" style={{ width:'100%', marginBottom:6 }}>
              <p style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'1rem', fontWeight:400, color:'rgba(245,236,215,0.38)', textAlign:'center', margin:'0 0 14px' }}>{persona === 'pet' ? 'Who are we honoring?' : 'Whose story are we preserving?'}</p>
              <input className="ws-input" type="text" value={name} autoFocus onChange={e => setName(e.target.value)} onKeyDown={e => e.key==='Enter' && handleGo()} placeholder={hintFade ? (isWissums ? PET_HINTS[hintIdx % PET_HINTS.length] : HINTS[hintIdx]) : ''} />
            </div>

            <div className="r4" style={{ width:'100%', marginBottom:22 }}>
              <button onClick={() => setShowOpts(v => !v)} style={{ width:'100%', padding:'9px 0', background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', marginTop:8 }}>
                <span style={{ fontSize:8, fontWeight:900, letterSpacing:'.38em', textTransform:'uppercase', color:'rgba(245,236,215,0.18)' }}>Options</span>
                <span style={{ fontSize:9, color:'rgba(196,151,59,0.4)', background:'rgba(196,151,59,0.08)', padding:'2px 8px', borderRadius:6, fontWeight:700 }}>{LANGUAGES.find(l => l.code === language)?.native}</span>
                <span style={{ fontSize:9, color:'rgba(245,236,215,0.22)', background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:6, fontWeight:700 }}>{voice==='Kore'?'Her Voice':'His Voice'}</span>
                <span style={{ color:'rgba(245,236,215,0.18)', fontSize:9 }}>{showOpts?'▲':'▼'}</span>
              </button>
              <div style={{ maxHeight:showOpts?360:0, overflow:'hidden', opacity:showOpts?1:0, transition:'max-height .45s cubic-bezier(.16,1,.3,1),opacity .3s ease' }}>
                <div style={{ paddingTop:16, display:'flex', flexDirection:'column', gap:20 }}>
                  <div>
                    <p style={{ fontSize:8, fontWeight:900, letterSpacing:'.44em', textTransform:'uppercase', color:'rgba(196,151,59,0.4)', marginBottom:10 }}>Language</p>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {LANGUAGES.map(l => <button key={l.code} className={`ws-pill${language===l.code?' on':''}`} onClick={() => setLanguage(l.code)}>{l.native}</button>)}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize:8, fontWeight:900, letterSpacing:'.44em', textTransform:'uppercase', color:'rgba(196,151,59,0.4)', marginBottom:10 }}>Narrator Voice</p>
                    <div style={{ display:'flex', gap:10 }}>
                      {(['Kore','Fenrir'] as string[]).map(v => (
                        <button key={v} className={`ws-vbtn${voice===v?(v==='Kore'?' her':' his'):''}`} onClick={() => setVoice(v)}>
                          <div style={{ fontSize:10, fontWeight:900, letterSpacing:'.06em', textTransform:'uppercase', color:'rgba(245,236,215,0.7)', marginBottom:3 }}>{v==='Kore'?'Her Voice':'His Voice'}</div>
                          <div style={{ fontSize:10, fontStyle:'italic', fontFamily:'Georgia,serif', color:'rgba(245,236,215,0.3)' }}>{v==='Kore'?'Warm, intimate':'Deep, resonant'}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="r5" style={{ width:'100%', marginBottom:44 }}>
              <button disabled={!can} onClick={handleGo} style={{ width:'100%', padding:'18px 0', borderRadius:100, fontWeight:900, fontSize:11, letterSpacing:'.38em', textTransform:'uppercase', border:'none', cursor:can?'pointer':'default', transition:'all .25s ease', ...(can ? { background:'linear-gradient(145deg,#9B3548 0%,#8B2E3B 55%,#7A1F2E 100%)', color:'white', boxShadow:'0 12px 36px rgba(139,46,59,0.4)' } : { background:'rgba(255,255,255,0.06)', color:'rgba(245,236,215,0.2)' }) }}>
                {can ? `Preserve ${name.trim()}'s Story →` : 'Enter their name above'}
              </button>
            </div>
          </>
        )}

        {/* Saved stories */}
        {(storiesLoading || savedStories.length > 0) && (
          <div className="r6" style={{ width:'100%' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
              <span style={{ fontSize:8, fontWeight:900, letterSpacing:'.44em', textTransform:'uppercase', color:'rgba(245,236,215,0.18)' }}>Saved Legacies</span>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
            </div>
            {storiesLoading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[1,2].map(i => (
                  <div key={i} style={{ height:52, borderRadius:14, overflow:'hidden', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ height:'100%', width:'40%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.04) 50%,transparent)', animation:'ws-shimmer 1.6s ease-in-out infinite' }} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {savedStories.slice(0, 3).map(s => (
                  <button key={s.sessionId} className="ws-card" onClick={() => onViewStory?.(s.sessionId)}>
                    <div>
                      <div style={{ fontFamily:'Georgia,serif', fontWeight:700, fontSize:'.92rem', color:'rgba(245,236,215,0.75)', marginBottom:3 }}>{formatDisplayName(s.storytellerName) || s.storytellerName}</div>
                      <div style={{ fontSize:8, fontWeight:900, letterSpacing:'.35em', textTransform:'uppercase', color:'rgba(245,236,215,0.25)' }}>{new Date(s.savedAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
                    </div>
                    <span style={{ color:'rgba(196,151,59,0.35)', fontSize:'.7rem' }}>▶</span>
                  </button>
                ))}
                {savedStories.length > 3 && onViewShelf && (
                  <button className="ws-card" onClick={onViewShelf} style={{ justifyContent:'center' }}>
                    <span style={{ fontSize:8, fontWeight:900, letterSpacing:'.35em', textTransform:'uppercase', color:'rgba(196,151,59,0.5)' }}>+ {savedStories.length - 3} more legacies →</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop:44, display:'flex', alignItems:'center', gap:24, flexWrap:'wrap', justifyContent:'center' }}>
          {onViewShelf && (
            <button onClick={onViewShelf} style={footerBtnStyle()}
              onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.4)'}
              onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.15)'}
            >📚 Archive</button>
          )}
          <button
            className="fg-btn"
            onClick={() => setShowFieldGuide(true)}
            style={{ ...footerBtnStyle('rgba(196,151,59,0.25)') }}
            onMouseEnter={e => e.currentTarget.style.color='rgba(196,151,59,0.6)'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(196,151,59,0.25)'}
          >
            📋 Field Guide
          </button>
          {/* Show sign in if no supabase user, otherwise show legacy logout */}
          {!supabaseUser && onSignIn ? (
            <button onClick={onSignIn} style={footerBtnStyle('rgba(196,151,59,0.35)')}
              onMouseEnter={e => e.currentTarget.style.color='rgba(196,151,59,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color='rgba(196,151,59,0.35)'}
            >Sign In / My Stories</button>
          ) : (
            <button onClick={onLogout} style={footerBtnStyle('rgba(255,255,255,0.1)')}
              onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.3)'}
              onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.1)'}
            >Sign Out</button>
          )}
        </div>

      </div>

      {showFieldGuide && <FieldGuideModal onClose={() => setShowFieldGuide(false)} />}
    </div>
  );
};
