import React, { useState, useEffect } from 'react';
import XMarkIcon from './icons/XMarkIcon';
import GlobeAmericasIcon from './icons/GlobeAmericasIcon';
import ClockIcon from './icons/ClockIcon';
import MusicNoteIcon from './icons/MusicNoteIcon';

// Routes through story-cascade edge function — no API key in client
const STORY_CASCADE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co/functions/v1/story-cascade';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';

interface TimeCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: string;
  location?: string;
}

interface TimeCapsuleData {
  news: string[];
  culture: string[];
  prices: string[];
  music: string[];
  context: string;
}

async function fetchTimeCapsule(year: string, location?: string): Promise<TimeCapsuleData> {
  const res = await fetch(STORY_CASCADE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: 'time_capsule',
      year,
      location,
    }),
  });

  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return {
    news: Array.isArray(data.news) ? data.news : [],
    culture: Array.isArray(data.culture) ? data.culture : [],
    music: Array.isArray(data.music) ? data.music : [],
    prices: Array.isArray(data.prices) ? data.prices : [],
    context: typeof data.context === 'string' ? data.context : '',
  };
}

const TimeCapsuleModal: React.FC<TimeCapsuleModalProps> = ({ isOpen, onClose, year, location }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TimeCapsuleData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !year) return;
    setLoading(true);
    setError(null);
    setData(null);
    fetchTimeCapsule(year, location)
      .then(setData)
      .catch(err => { console.error('TimeCapsule:', err); setError('Could not reach historical archives. Try again.'); })
      .finally(() => setLoading(false));
  }, [isOpen, year, location]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: 'linear-gradient(160deg, #1A0F07 0%, #0D0B0A 100%)', border: '1px solid rgba(196,151,59,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="p-6 flex justify-between items-start flex-shrink-0" style={{ borderBottom: '1px solid rgba(196,151,59,0.1)' }}>
          <div>
            <div className="flex items-center gap-2 mb-2" style={{ color: 'rgba(196,151,59,0.6)' }}>
              <ClockIcon className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Time Capsule</span>
            </div>
            <h2 className="text-5xl font-display font-black text-white tracking-tight">{year}</h2>
            {location && <p className="text-white/30 font-serif italic text-sm mt-1">{location}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <XMarkIcon className="w-5 h-5 text-white/40" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <GlobeAmericasIcon className="w-10 h-10 animate-spin" style={{ color: 'rgba(196,151,59,0.5)' }} />
              <p className="text-white/30 font-serif italic text-sm">Consulting historical archives...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400/70 font-serif italic text-sm">{error}</p>
              <button onClick={() => { setLoading(true); fetchTimeCapsule(year, location).then(setData).catch(() => setError('Try again later.')).finally(() => setLoading(false)); }} className="mt-4 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 border border-white/10 transition-all">
                Try Again
              </button>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Context vibe */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(196,151,59,0.08)', border: '1px solid rgba(196,151,59,0.15)' }}>
                <p className="font-serif italic text-base leading-relaxed" style={{ color: 'rgba(245,236,215,0.8)' }}>"{data.context}"</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Section title="Headlines" items={data.news} icon="📰" />
                <Section title="Pop Culture" items={data.culture} icon="🎭" />
                <Section title="Top Songs" items={data.music} icon="🎵" />
                <Section title="Cost of Living" items={data.prices} icon="💰" />
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; items: string[]; icon: string }> = ({ title, items, icon }) => (
  <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 flex items-center gap-2" style={{ color: 'rgba(196,151,59,0.7)' }}>
      <span>{icon}</span>{title}
    </h3>
    <ul className="space-y-2">
      {(items || []).map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm font-serif leading-snug" style={{ color: 'rgba(245,236,215,0.6)' }}>
          <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'rgba(196,151,59,0.4)' }} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export default TimeCapsuleModal;
