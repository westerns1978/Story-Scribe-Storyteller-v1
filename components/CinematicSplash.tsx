import React, { useEffect, useState } from 'react';

interface CinematicSplashProps {
  onComplete: () => void;
}

// Warm vintage Unsplash photos — public domain, no auth needed
const PHOTOS = [
  'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=800&q=70', // old letters/hands
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=70', // family warmth
  'https://images.unsplash.com/photo-1499810631641-541e76d678a2?w=800&q=70', // vintage portrait feel
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=70', // warm light landscape
];

const TOTAL_MS = 4500;
const CONNIE_AT = 2800;
const LOGO_AT = 3200;
const FADEOUT_AT = 3900;

export const CinematicSplash: React.FC<CinematicSplashProps> = ({ onComplete }) => {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [connieIn, setConnieIn] = useState(false);
  const [logoIn, setLogoIn] = useState(false);
  const [out, setOut] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => setReady(true), 80);
    const t1 = setTimeout(() => setPhotoIdx(1), 1100);
    const t2 = setTimeout(() => setPhotoIdx(2), 2200);
    const t3 = setTimeout(() => setConnieIn(true), CONNIE_AT);
    const t4 = setTimeout(() => setLogoIn(true), LOGO_AT);
    const t5 = setTimeout(() => setOut(true), FADEOUT_AT);
    const t6 = setTimeout(onComplete, TOTAL_MS);
    return () => [t0,t1,t2,t3,t4,t5,t6].forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: '#08060A',
      opacity: out ? 0 : ready ? 1 : 0,
      transition: out ? 'opacity 0.6s ease-in' : 'opacity 0.5s ease-out',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes kb { 0% { transform:scale(1.05); } 100% { transform:scale(1.18); } }
        @keyframes ph-in { from { opacity:0; } to { opacity:1; } }
        @keyframes connie-rise { from { opacity:0; transform:translateY(24px) scale(.97); } to { opacity:1; transform:none; } }
        @keyframes logo-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes breathe { 0%,100% { transform:scale(1); opacity:.6; } 50% { transform:scale(1.08); opacity:.9; } }
      `}</style>

      {/* Ken Burns photo */}
      <div key={photoIdx} style={{
        position: 'absolute', inset: '-8%',
        animation: 'ph-in .9s ease both, kb 5s ease-out both',
      }}>
        <img
          src={PHOTOS[photoIdx]}
          style={{ width:'100%', height:'100%', objectFit:'cover', filter:'sepia(40%) brightness(.55) contrast(1.1)' }}
          alt=""
        />
      </div>

      {/* Warm vignette + color wash */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 20%, rgba(4,2,6,.92) 100%)',
      }}/>
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'linear-gradient(to bottom, rgba(8,4,2,.6) 0%, transparent 30%, transparent 70%, rgba(8,4,2,.85) 100%)',
      }}/>
      {/* Amber hearth wash from bottom */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 100% 40% at 50% 110%, rgba(196,151,59,.18) 0%, transparent 60%)',
      }}/>

      {/* Connie emerges */}
      <div style={{
        position:'absolute', inset:0,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        opacity: connieIn ? 1 : 0,
        animation: connieIn ? 'connie-rise 1.2s cubic-bezier(.16,1,.3,1) both' : 'none',
      }}>
        {/* Glow halo */}
        <div style={{
          position:'absolute', width:220, height:220, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(196,151,59,.2) 0%, transparent 70%)',
          animation:'breathe 3s ease-in-out infinite',
        }}/>

        {/* Portrait ring */}
        <div style={{
          position:'relative', width:120, height:120, borderRadius:'50%',
          border:'1px solid rgba(196,151,59,.3)',
          boxShadow:'0 0 50px rgba(196,151,59,.15)',
          overflow:'hidden', marginBottom:24,
          background:'radial-gradient(ellipse at 40% 35%, rgba(196,151,59,.12) 0%, rgba(40,15,20,.8) 100%)',
        }}>
          {/* Connie's AI-generated face from Wissums CDN */}
          <img
            src="https://storage.googleapis.com/gemynd-public/projects/wissums/connie-portrait.jpg"
            style={{ width:'100%', height:'100%', objectFit:'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            alt="Connie"
          />
          {/* Warm overlay */}
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(to bottom, transparent 50%, rgba(8,4,2,.5) 100%)',
          }}/>
        </div>

        <p style={{
          fontFamily:'Georgia,"Times New Roman",serif', fontStyle:'italic',
          fontSize:'1.6rem', fontWeight:400,
          color:'rgba(245,236,215,.8)', letterSpacing:'.04em', margin:'0 0 8px',
        }}>Connie</p>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ height:1, width:22, background:'rgba(196,151,59,.25)' }}/>
          <p style={{
            fontSize:8, fontWeight:900, letterSpacing:'.45em',
            textTransform:'uppercase', color:'rgba(196,151,59,.45)', margin:0,
          }}>Memory Curator</p>
          <div style={{ height:1, width:22, background:'rgba(196,151,59,.25)' }}/>
        </div>
      </div>

      {/* Logo — top */}
      <div style={{
        position:'absolute', top:40, left:0, right:0, textAlign:'center',
        opacity: logoIn ? 1 : 0,
        animation: logoIn ? 'logo-in .8s cubic-bezier(.16,1,.3,1) both' : 'none',
      }}>
        <p style={{
          fontSize:8, fontWeight:900, letterSpacing:'.5em',
          textTransform:'uppercase', color:'rgba(196,151,59,.4)',
          margin:0, fontFamily:'Georgia,serif',
        }}>Wissums</p>
      </div>
    </div>
  );
};

export default CinematicSplash;
