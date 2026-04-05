import React, { useState, useEffect } from 'react';

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';

interface Memory { id: string; contributor_name: string; transcript: string; created_at: string; }
interface TributeWallProps { storyId: string; storySubject: string; }

export const TributeWall: React.FC<TributeWallProps> = ({ storyId, storySubject }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const gold = '#C4973B';

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/story_memories?story_session_id=eq.${storyId}&order=created_at.asc`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    }).then(r => r.ok ? r.json() : []).then(setMemories).catch(() => {}).finally(() => setLoading(false));
  }, [storyId]);

  const copyTributeLink = () => {
    const url = `${window.location.origin}?tribute=${storyId}&for=${encodeURIComponent(storySubject)}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ color: `${gold}60`, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading memories…</div>
    </div>
  );

  return (
    <div style={{ padding: '32px 24px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: `${gold}70`, fontWeight: 700, marginBottom: 8 }}>Tribute Wall</div>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: 'rgba(30,20,10,0.9)', margin: 0 }}>Memories of {storySubject}</h3>
        <p style={{ color: 'rgba(30,20,10,0.45)', fontSize: 13, marginTop: 8, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          {memories.length === 0
            ? 'No memories shared yet. Invite family and friends.'
            : `${memories.length} memory${memories.length === 1 ? '' : 'ies'} shared`}
        </p>
      </div>

      <button onClick={copyTributeLink} style={{
        width: '100%', padding: '14px', marginBottom: 28,
        background: 'linear-gradient(135deg, rgba(196,151,59,0.12), rgba(196,151,59,0.05))',
        border: '1.5px dashed rgba(196,151,59,0.4)', borderRadius: 12,
        color: gold, fontWeight: 700, fontSize: 12, cursor: 'pointer',
        letterSpacing: '0.15em', textTransform: 'uppercase',
      }}>
        {copied ? '✓ Link Copied!' : '🕯️ Copy Link to Invite Memories'}
      </button>

      {memories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'rgba(30,20,10,0.3)', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 15 }}>
          When family and friends share memories through Connie,<br />they'll appear here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {memories.map(m => (
            <div key={m.id} style={{ padding: '20px 24px', background: 'rgba(196,151,59,0.04)', border: '1px solid rgba(196,151,59,0.15)', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, color: 'rgba(30,20,10,0.8)', fontSize: 14 }}>{m.contributor_name}</div>
                <div style={{ fontSize: 11, color: 'rgba(30,20,10,0.3)' }}>
                  {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.7, color: 'rgba(30,20,10,0.65)', whiteSpace: 'pre-wrap' }}>
                {m.transcript}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TributeWall;
