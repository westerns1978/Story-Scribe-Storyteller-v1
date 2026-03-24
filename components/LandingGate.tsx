import React, { useState, useEffect, useRef } from 'react';
import { IValtModal } from './IValtModal';

interface Customer {
  id: string;
  name: string;
  email: string;
  org_id: string;
  is_admin: boolean;
}

interface LandingGateProps {
  onLogin: (customer: Customer) => void;
}

const DEMO_ORG_ID = '71077b47-66e8-4fd9-90e7-709773ea6582';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}\u2013${d.slice(6)}`;
};

// Connie's words — what she actually says when she meets someone
// These rotate slowly, like she's whispering across time
const CONNIE_WHISPERS = [
  { line: "Tell me about the person you love most.", sub: "That's always where the best stories live." },
  { line: "I have all the time in the world.", sub: "And I want to hear everything." },
  { line: "What do you wish you'd asked them?", sub: "It's not too late to find the answers." },
  { line: "Every life holds a story worth telling.", sub: "Let's find theirs together." },
  { line: "The small moments are the ones that last.", sub: "What small moment do you remember most?" },
];

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

export const LandingGate: React.FC<LandingGateProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'landing' | 'biometric' | 'archive'>('landing');
  const [phone, setPhone] = useState('');
  const [showIValt, setShowIValt] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState(0); // 0=dark 1=connie appears 2=line fades in 3=buttons
  const [whisperIdx, setWhisperIdx] = useState(0);
  const [whisperVisible, setWhisperVisible] = useState(true);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Orchestrated reveal — each beat lands separately
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Connie's whispers rotate slowly
  useEffect(() => {
    const id = setInterval(() => {
      setWhisperVisible(false);
      setTimeout(() => {
        setWhisperIdx(i => (i + 1) % CONNIE_WHISPERS.length);
        setWhisperVisible(true);
      }, 800);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (mode === 'biometric') setTimeout(() => phoneRef.current?.focus(), 300);
  }, [mode]);

  const guestLogin = () => onLogin({
    id: `guest-${Date.now()}`, name: 'Guest',
    email: 'guest@storyscribe.app', org_id: DEMO_ORG_ID, is_admin: false,
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));

  const handleBiometricTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) setShowIValt(true);
  };

  const handleIValtSuccess = () => {
    setShowIValt(false);
    onLogin({ id: `ivalt-${Date.now()}`, name: 'Archivist', email: `${phone}@ivalt.auth`, org_id: DEMO_ORG_ID, is_admin: false });
  };

  const handleArchiveLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Please enter your credentials.'); return; }
    setIsLoading(true); setError('');
    try {
      const res = await fetch('https://ldzzlndsspkyohvzfiiu.supabase.co/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.msg || 'Access denied');
      onLogin({
        id: data.user?.id || `user-${Date.now()}`,
        name: data.user?.user_metadata?.name || email.split('@')[0],
        email: data.user?.email || email,
        org_id: data.user?.user_metadata?.org_id || DEMO_ORG_ID,
        is_admin: data.user?.user_metadata?.is_admin || false,
      });
    } catch (err: any) {
      setError(err.message || 'Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminBypass = async () => {
    setIsLoading(true);
    try {
      const aiStudio = (window as any).aistudio;
      if (aiStudio?.hasSelectedApiKey) {
        const hasKey = await aiStudio.hasSelectedApiKey();
        if (!hasKey) await aiStudio.openSelectKey();
      }
      const admin = { id: 'admin-001', email: 'admin@gemynd.com', name: 'Archive Curator', org_id: DEMO_ORG_ID, is_admin: true };
      localStorage.setItem('storyscribe_customer', JSON.stringify(admin));
      onLogin(admin);
    } catch { setError('Override failed.'); }
    finally { setIsLoading(false); }
  };

  const whisper = CONNIE_WHISPERS[whisperIdx];

  // ─── MAIN LANDING ──────────────────────────────────────────────────────────────
  if (mode === 'landing') return (
    <div className="fixed inset-0 overflow-hidden flex flex-col" style={{ background: '#08060A' }}>
      <style>{`
        @keyframes lg-breathe {
          0%,100% { opacity:.45; transform:scale(1); }
          50%      { opacity:.75; transform:scale(1.06); }
        }
        @keyframes lg-drift {
          0%   { transform:translateY(0) translateX(0); }
          33%  { transform:translateY(-18px) translateX(6px); }
          66%  { transform:translateY(8px) translateX(-4px); }
          100% { transform:translateY(0) translateX(0); }
        }
        @keyframes lg-up {
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes lg-in {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes lg-cursor {
          0%,100% { opacity:1; } 50% { opacity:0; }
        }
        @keyframes lg-particle {
          0%   { transform:translateY(0) translateX(0); opacity:0; }
          10%  { opacity:1; }
          90%  { opacity:.4; }
          100% { transform:translateY(-120px) translateX(var(--tx,8px)); opacity:0; }
        }
        .lg-phase1 { animation: lg-up .9s cubic-bezier(.16,1,.3,1) both; }
        .lg-phase2 { animation: lg-up .9s cubic-bezier(.16,1,.3,1) .35s both; }
        .lg-phase3 { animation: lg-up .9s cubic-bezier(.16,1,.3,1) .6s both; }
        .lg-grain {
          background-image: ${GRAIN_SVG};
          background-size: 180px;
        }
        .lg-whisper-enter {
          animation: lg-up .8s cubic-bezier(.16,1,.3,1) both;
        }
      `}</style>

      {/* Layered atmospheric bg */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Warm amber pool at bottom — the hearth */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 110% 50% at 50% 110%, rgba(196,151,59,0.14) 0%, rgba(139,46,59,0.1) 40%, transparent 65%)' }} />
        {/* Deep burgundy crown at top */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 35% at 50% -5%, rgba(80,15,25,0.55) 0%, transparent 60%)' }} />
        {/* Hard vignette — keeps focus center */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 35%, rgba(4,2,6,0.92) 100%)' }} />
        {/* Film grain */}
        <div className="lg-grain absolute inset-0 opacity-[0.033]" />
      </div>

      {/* Floating light particles — candlelight embers */}
      {[
        { left:'12%', delay:'0s',  dur:'14s', tx:'6px'  },
        { left:'28%', delay:'3s',  dur:'18s', tx:'-8px' },
        { left:'55%', delay:'7s',  dur:'12s', tx:'10px' },
        { left:'72%', delay:'1s',  dur:'16s', tx:'-5px' },
        { left:'88%', delay:'5s',  dur:'20s', tx:'7px'  },
        { left:'42%', delay:'9s',  dur:'15s', tx:'-9px' },
      ].map((p, i) => (
        <div key={i} style={{
          position:'absolute', bottom:'15%', left:p.left,
          width:2, height:2, borderRadius:'50%',
          background:'rgba(196,151,59,0.5)',
          ['--tx' as any]: p.tx,
          animation:`lg-particle ${p.dur} ease-in ${p.delay} infinite`,
        }} />
      ))}

      {/* Content — vertically split: story above, action below */}
      <div className="relative z-10 flex flex-col h-full">

        {/* ── TOP: Emotional story ──────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-end pb-10 px-8 text-center">

          {/* Gemynd mark — small, reverent */}
          <div style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all .9s cubic-bezier(.16,1,.3,1)',
            marginBottom: 40,
          }}>
            <div style={{ position:'relative', width:44, height:44, margin:'0 auto 14px' }}>
              <div style={{
                position:'absolute', inset:0, borderRadius:'50%',
                background:'rgba(139,46,59,0.5)', filter:'blur(14px)',
                animation:'lg-breathe 4s ease-in-out infinite',
              }} />
              <img
                src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png"
                style={{ width:'100%', height:'100%', objectFit:'contain', position:'relative', zIndex:1, filter:'drop-shadow(0 0 12px rgba(168,45,45,0.6))' }}
                alt="Gemynd"
              />
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              <div style={{ height:1, width:28, background:'rgba(196,151,59,0.2)' }} />
              <span style={{ fontSize:8, fontWeight:900, letterSpacing:'0.45em', textTransform:'uppercase', color:'rgba(196,151,59,0.4)', fontFamily:'Georgia,serif' }}>
                Story Scribe
              </span>
              <div style={{ height:1, width:28, background:'rgba(196,151,59,0.2)' }} />
            </div>
          </div>

          {/* The big emotional headline */}
          <div style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all .9s cubic-bezier(.16,1,.3,1) .15s',
            marginBottom: 32,
          }}>
            <h1 style={{
              fontFamily: 'Georgia,"Times New Roman",serif',
              fontWeight: 900,
              color: '#F5ECD7',
              fontSize: 'clamp(2.4rem,8vw,3.6rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              margin: '0 0 18px',
            }}>
              Their story<br />
              <em style={{ color:'rgba(196,151,59,0.75)', fontStyle:'italic' }}>deserves</em><br />
              to live forever.
            </h1>
            <p style={{
              fontFamily: 'Georgia,serif', fontStyle:'italic',
              color:'rgba(245,236,215,0.38)', fontSize:'1rem',
              lineHeight:1.65, margin:0,
            }}>
              Connie gently listens. AI agents weave memories<br />
              into a cinematic legacy your family keeps forever.
            </p>
          </div>

          {/* Connie's rotating whisper — the voice of the product */}
          <div style={{
            opacity: phase >= 3 ? 1 : 0,
            transition: 'opacity .9s ease .4s',
            minHeight: 72,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          }}>
            <div key={whisperIdx} className={whisperVisible ? 'lg-whisper-enter' : ''} style={{
              opacity: whisperVisible ? 1 : 0,
              transition: whisperVisible ? 'none' : 'opacity .8s ease',
              textAlign:'center',
            }}>
              {/* Ornamental quote mark */}
              <div style={{ fontSize:36, lineHeight:1, color:'rgba(139,46,59,0.35)', fontFamily:'Georgia,serif', marginBottom:4 }}>"</div>
              <p style={{
                fontFamily:'Georgia,serif', fontStyle:'italic',
                color:'rgba(245,236,215,0.5)', fontSize:'0.93rem',
                lineHeight:1.6, margin:'0 0 8px',
              }}>
                {whisper.line}
              </p>
              <p style={{
                fontSize:9, fontWeight:900, letterSpacing:'0.35em', textTransform:'uppercase',
                color:'rgba(196,151,59,0.3)',
              }}>
                {whisper.sub}
              </p>
            </div>
          </div>
        </div>

        {/* ── BOTTOM: Action ────────────────────────────────── */}
        <div style={{
          padding:'0 28px 36px',
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all .9s cubic-bezier(.16,1,.3,1) .55s',
        }}>
          <div style={{ maxWidth:340, margin:'0 auto' }}>

            {/* Primary — Begin. Not "access archive". */}
            <button
              onClick={guestLogin}
              style={{
                width:'100%', padding:'19px 0', borderRadius:100,
                background:'linear-gradient(145deg, #9B3548 0%, #8B2E3B 55%, #7A1F2E 100%)',
                border:'1px solid rgba(255,255,255,0.09)',
                boxShadow:'0 20px 55px rgba(139,46,59,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
                color:'white', fontWeight:900, fontSize:11,
                letterSpacing:'0.38em', textTransform:'uppercase',
                cursor:'pointer', display:'block',
                transition:'all .25s ease', position:'relative', overflow:'hidden',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 26px 65px rgba(139,46,59,0.7), inset 0 1px 0 rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 20px 55px rgba(139,46,59,0.55), inset 0 1px 0 rgba(255,255,255,0.08)'; }}
            >
              Begin — No Account Needed
            </button>

            {/* Divider */}
            <div style={{ display:'flex', alignItems:'center', gap:12, margin:'14px 0' }}>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
              <span style={{ fontSize:8, fontWeight:900, letterSpacing:'0.42em', textTransform:'uppercase', color:'rgba(255,255,255,0.15)' }}>or</span>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
            </div>

            {/* Secondary — return visitor */}
            <button
              onClick={() => setMode('biometric')}
              style={{
                width:'100%', padding:'15px 0', borderRadius:100,
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.1)',
                color:'rgba(245,236,215,0.45)', fontWeight:900, fontSize:10,
                letterSpacing:'0.32em', textTransform:'uppercase',
                cursor:'pointer', transition:'all .2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,236,215,0.7)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,236,215,0.45)';
              }}
            >
              Sign In to My Archive
            </button>

            {/* Reassurance line */}
            <p style={{
              textAlign:'center', marginTop:14, fontSize:9, fontFamily:'Georgia,serif',
              fontStyle:'italic', color:'rgba(255,255,255,0.18)', lineHeight:1.6,
            }}>
              No account needed. Your story is always yours.
            </p>

            {/* Curator — nearly invisible */}
            <div style={{ textAlign:'center', marginTop:20 }}>
              <button
                onClick={() => setMode('archive')}
                style={{ fontSize:8, fontWeight:900, letterSpacing:'0.32em', textTransform:'uppercase', color:'rgba(255,255,255,0.1)', background:'none', border:'none', cursor:'pointer', transition:'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.32)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.1)')}
              >
                Curator & Admin Access ↗
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── BIOMETRIC ─────────────────────────────────────────────────────────────────
  if (mode === 'biometric') return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background:'#08060A' }}>
      <style>{`
        @keyframes lg-up { from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);} }
        @keyframes lg-breathe-ring { 0%,100%{box-shadow:0 0 0 0px rgba(139,46,59,0);}50%{box-shadow:0 0 0 10px rgba(139,46,59,0.1);} }
        .lg-b1{animation:lg-up .85s cubic-bezier(.16,1,.3,1) .05s both;}
        .lg-b2{animation:lg-up .85s cubic-bezier(.16,1,.3,1) .18s both;}
        .lg-b3{animation:lg-up .85s cubic-bezier(.16,1,.3,1) .32s both;}
        .lg-grain{background-image:${GRAIN_SVG};background-size:180px;}
      `}</style>
      <div className="absolute inset-0 lg-grain opacity-[0.03] pointer-events-none" />
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 45% at 50% 100%, rgba(139,46,59,0.15) 0%, transparent 65%)' }} />

      <div style={{ width:'100%', maxWidth:320, padding:'0 28px', position:'relative', zIndex:10 }}>
        <button onClick={() => setMode('landing')} style={{ fontSize:9, fontWeight:900, letterSpacing:'0.4em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', background:'none', border:'none', cursor:'pointer', marginBottom:36, display:'flex', alignItems:'center', gap:8, transition:'color .2s' }}
          onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,0.55)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.22)')}>
          ← Back
        </button>

        <div className="lg-b1" style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{
            width:52, height:52, borderRadius:'50%', margin:'0 auto 20px',
            background:'rgba(139,46,59,0.1)', border:'1px solid rgba(139,46,59,0.22)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
            animation:'lg-breathe-ring 3.5s ease-in-out infinite',
          }}>🔐</div>
          <h2 style={{ fontFamily:'Georgia,serif', fontWeight:900, color:'#F5ECD7', fontSize:'1.9rem', letterSpacing:'-0.02em', margin:'0 0 10px' }}>
            Welcome back
          </h2>
          <p style={{ fontFamily:'Georgia,serif', fontStyle:'italic', color:'rgba(245,236,215,0.32)', fontSize:'0.88rem', lineHeight:1.65 }}>
            Enter your mobile number.<br />iValt confirms on your device — no password needed.
          </p>
        </div>

        <form onSubmit={handleBiometricTrigger} className="lg-b2" style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ display:'block', fontSize:8, fontWeight:900, letterSpacing:'0.42em', textTransform:'uppercase', color:'rgba(196,151,59,0.38)', marginBottom:10 }}>
              Mobile Number
            </label>
            <input
              ref={phoneRef} type="tel" inputMode="numeric"
              value={formatPhone(phone)} onChange={handlePhoneChange}
              placeholder="(000) 000–0000"
              style={{
                width:'100%', boxSizing:'border-box',
                background:'rgba(255,255,255,0.04)',
                border: phone.length >= 10 ? '1.5px solid rgba(139,46,59,0.55)' : '1.5px solid rgba(255,255,255,0.08)',
                borderRadius:18, padding:'18px 20px',
                color:'white', fontSize:'1.25rem', fontFamily:'monospace', textAlign:'center',
                letterSpacing:'0.18em', outline:'none',
                boxShadow: phone.length >= 10 ? '0 0 0 3px rgba(139,46,59,0.1)' : 'none',
                transition:'all .3s ease',
              }}
            />
          </div>
          <button type="submit" disabled={phone.length < 10} style={{
            padding:'18px 0', borderRadius:100,
            background: phone.length >= 10 ? 'linear-gradient(145deg,#9B3548,#8B2E3B)' : 'rgba(255,255,255,0.04)',
            color:'white', fontWeight:900, fontSize:10, letterSpacing:'0.32em', textTransform:'uppercase',
            border:'1px solid rgba(255,255,255,0.08)',
            boxShadow: phone.length >= 10 ? '0 16px 42px rgba(139,46,59,0.45)' : 'none',
            opacity: phone.length < 10 ? 0.35 : 1,
            cursor: phone.length < 10 ? 'default' : 'pointer',
            transition:'all .35s ease',
          }}>
            {phone.length >= 10 ? 'Send Biometric Request →' : 'Enter your number'}
          </button>
        </form>

        <div className="lg-b3" style={{ marginTop:28, textAlign:'center', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:.2 }}>
            <div style={{ width:12, height:12, borderRadius:3, background:'rgba(255,255,255,0.5)' }} />
            <span style={{ fontSize:8, fontWeight:900, letterSpacing:'0.35em', textTransform:'uppercase', color:'white' }}>Secured by iValt</span>
          </div>
          <button onClick={() => setMode('archive')} style={{ fontSize:8, fontWeight:900, letterSpacing:'0.28em', textTransform:'uppercase', color:'rgba(255,255,255,0.16)', background:'none', border:'none', cursor:'pointer', transition:'color .2s' }}
            onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,0.42)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.16)')}>
            Use password instead →
          </button>
        </div>
      </div>

      {showIValt && (
        <IValtModal phoneNumber={phone} isOpen={showIValt} onSuccess={handleIValtSuccess} onCancel={() => setShowIValt(false)} />
      )}
    </div>
  );

  // ─── ARCHIVE / CURATOR LOGIN ───────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background:'#08060A' }}>
      <style>{`
        @keyframes lg-up { from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);} }
        .lg-a1{animation:lg-up .85s cubic-bezier(.16,1,.3,1) .05s both;}
        .lg-a2{animation:lg-up .85s cubic-bezier(.16,1,.3,1) .18s both;}
        .lg-a3{animation:lg-up .85s cubic-bezier(.16,1,.3,1) .32s both;}
        .lg-grain{background-image:${GRAIN_SVG};background-size:180px;}
      `}</style>
      <div className="absolute inset-0 lg-grain opacity-[0.03] pointer-events-none" />
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 45% at 50% 100%, rgba(139,46,59,0.12) 0%, transparent 65%)' }} />

      <div style={{ width:'100%', maxWidth:310, padding:'0 28px', position:'relative', zIndex:10 }}>
        <button onClick={() => setMode('landing')} style={{ fontSize:9, fontWeight:900, letterSpacing:'0.4em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', background:'none', border:'none', cursor:'pointer', marginBottom:36, transition:'color .2s' }}
          onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,0.55)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.22)')}>
          ← Back
        </button>

        <div className="lg-a1" style={{ textAlign:'center', marginBottom:32 }}>
          <h2 style={{ fontFamily:'Georgia,serif', fontWeight:900, color:'#F5ECD7', fontSize:'1.9rem', letterSpacing:'-0.02em', margin:'0 0 8px' }}>
            Archive Access
          </h2>
          <p style={{ fontFamily:'Georgia,serif', fontStyle:'italic', color:'rgba(245,236,215,0.28)', fontSize:'0.85rem' }}>
            Curator & admin credentials only.
          </p>
        </div>

        <form onSubmit={handleArchiveLogin} className="lg-a2" style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { type:'email', value:email, onChange:(v:string)=>setEmail(v), placeholder:'Email address', autoFocus:true },
            { type:'password', value:password, onChange:(v:string)=>setPassword(v), placeholder:'Password', autoFocus:false },
          ].map((f,i) => (
            <input key={i} type={f.type} value={f.value} onChange={e=>f.onChange(e.target.value)}
              placeholder={f.placeholder} autoFocus={f.autoFocus}
              style={{
                width:'100%', boxSizing:'border-box',
                background:'rgba(255,255,255,0.04)', border:'1.5px solid rgba(255,255,255,0.08)',
                borderRadius:16, padding:'15px 20px', color:'white', fontSize:'0.9rem', outline:'none',
                transition:'border-color .2s',
              }}
              onFocus={e=>(e.currentTarget.style.borderColor='rgba(139,46,59,0.45)')}
              onBlur={e=>(e.currentTarget.style.borderColor='rgba(255,255,255,0.08)')}
            />
          ))}

          {error && <p style={{ color:'rgba(200,80,80,0.9)', fontSize:11, textAlign:'center', fontWeight:700 }}>{error}</p>}

          <button type="submit" disabled={isLoading} style={{
            marginTop:4, padding:'17px 0', borderRadius:100,
            background:'linear-gradient(145deg,#9B3548,#8B2E3B)', color:'white',
            fontWeight:900, fontSize:10, letterSpacing:'0.32em', textTransform:'uppercase',
            border:'1px solid rgba(255,255,255,0.08)',
            boxShadow:'0 16px 40px rgba(139,46,59,0.4)',
            opacity: isLoading ? 0.5 : 1, cursor: isLoading ? 'default' : 'pointer',
            transition:'opacity .2s',
          }}>
            {isLoading ? 'Opening Vault…' : 'Sign In →'}
          </button>
        </form>

        <div className="lg-a3" style={{ marginTop:24, textAlign:'center', display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => setMode('biometric')} style={{ fontSize:8, fontWeight:900, letterSpacing:'0.3em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)', background:'none', border:'none', cursor:'pointer', transition:'color .2s' }}
            onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,0.5)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.2)')}>
            Use iValt biometric instead →
          </button>
          <button onClick={handleAdminBypass} disabled={isLoading} style={{ fontSize:8, fontWeight:900, letterSpacing:'0.25em', textTransform:'uppercase', color:'rgba(255,255,255,0.08)', background:'none', border:'none', cursor:'pointer', transition:'color .2s' }}
            onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,0.25)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.08)')}>
            {isLoading ? 'Opening…' : 'Administrative Override'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingGate;
