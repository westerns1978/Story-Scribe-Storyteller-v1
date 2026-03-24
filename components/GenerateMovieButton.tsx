// components/GenerateMovieButton.tsx
// ============================================
// One-click movie generation.
// Calls generate_story_movie → mcp-orchestrator submits to Grok.
// Polls storyscribe_stories.assets.movie_status every 10s (lightweight DB read).
// Shows download button when movie_url appears.
// ============================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ActiveStory } from '../types';

interface GenerateMovieButtonProps {
  story: ActiveStory;
}

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';
const CASCADE_URL = `${SUPABASE_URL}/functions/v1/story-cascade`;
const GOLD = '#C4973B';
const POLL_INTERVAL = 10000; // 10 seconds

export const GenerateMovieButton: React.FC<GenerateMovieButtonProps> = ({ story }) => {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'generating' | 'done' | 'error'>('idle');
  const [movieUrl, setMovieUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, []);

  const pollForMovie = useCallback((sessionId: string) => {
    setStatus('generating');
    setElapsed(0);

    // Elapsed timer for UX
    elapsedRef.current = setInterval(() => {
      setElapsed(e => e + 1);
    }, 1000);

    // Poll Supabase for movie_status — not Grok API
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/storyscribe_stories?session_id=eq.${sessionId}&select=assets`,
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'apikey': SUPABASE_ANON_KEY,
            },
          }
        );
        if (!res.ok) return;

        const data = await res.json();
        const assets = data[0]?.assets || {};
        const movieStatus = assets.movie_status;

        if (movieStatus === 'done' && assets.movie_url) {
          if (pollRef.current) clearInterval(pollRef.current);
          if (elapsedRef.current) clearInterval(elapsedRef.current);
          setMovieUrl(assets.movie_url);
          setStatus('done');
        } else if (movieStatus === 'failed' || movieStatus === 'timeout') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (elapsedRef.current) clearInterval(elapsedRef.current);
          setError(assets.movie_error || 'Movie generation failed');
          setStatus('error');
        }
      } catch (e) {
        console.warn('[GenerateMovie] Poll error:', e);
      }
    }, POLL_INTERVAL);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (status !== 'idle') return;
    setStatus('submitting');
    setError('');

    const images = story.generatedImages || [];
    if (images.length === 0) {
      setError('No scene images found.');
      setStatus('error');
      return;
    }

    try {
      const res = await fetch(CASCADE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action: 'generate_movie',
          session_id: story.sessionId,
          storyteller_name: story.storytellerName,
          images: images.slice(0, 7),
          narrative: story.narrative || '',
          storyboard: story.storyboard,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Submission failed');

      // Start polling Supabase for completion
      pollForMovie(story.sessionId);

    } catch (e: any) {
      setError(e.message || 'Movie generation failed');
      setStatus('error');
    }
  }, [status, story, pollForMovie]);

  const handleDownload = useCallback(() => {
    if (!movieUrl) return;
    const a = document.createElement('a');
    a.href = movieUrl;
    a.download = `${(story.storytellerName || 'story').replace(/[^a-zA-Z0-9]/g, '_')}_Story.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [movieUrl, story.storytellerName]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const imageCount = Math.min((story.generatedImages || []).length, 7);
  const estimatedCost = (15 * 0.05).toFixed(2);

  if (status === 'done' && movieUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <button
          onClick={handleDownload}
          style={{
            padding: '14px 28px',
            background: 'rgba(74,222,128,0.1)',
            border: '1px solid rgba(74,222,128,0.35)',
            borderRadius: 100,
            color: '#4ade80',
            fontSize: 11, fontWeight: 900,
            letterSpacing: '.2em', textTransform: 'uppercase' as const,
            cursor: 'pointer', fontFamily: 'system-ui',
          }}
        >
          ⬇ Download Movie
        </button>
        <p style={{ fontSize: 9, color: 'rgba(74,222,128,0.5)', fontFamily: 'system-ui', letterSpacing: '.1em', textTransform: 'uppercase' as const }}>
          Ready · {formatElapsed(elapsed)}
        </p>
      </div>
    );
  }

  if (status === 'generating') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{
          padding: '14px 28px',
          background: 'rgba(196,151,59,0.06)',
          border: '1px solid rgba(196,151,59,0.2)',
          borderRadius: 100,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {/* Pulsing dots */}
          {[0, 200, 400].map(delay => (
            <div key={delay} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: GOLD, opacity: 0.7,
              animation: `pulse 1.2s ease-in-out ${delay}ms infinite`,
            }} />
          ))}
          <span style={{
            fontSize: 11, fontWeight: 900,
            letterSpacing: '.2em', textTransform: 'uppercase' as const,
            color: GOLD, fontFamily: 'system-ui',
          }}>
            Generating · {formatElapsed(elapsed)}
          </span>
        </div>
        <p style={{ fontSize: 9, color: 'rgba(245,236,215,0.3)', fontFamily: 'system-ui', textAlign: 'center', letterSpacing: '.1em' }}>
          Grok is animating {imageCount} scenes · typically 2-4 min
        </p>
      </div>
    );
  }

  if (status === 'submitting') {
    return (
      <div style={{
        padding: '14px 28px',
        background: 'rgba(196,151,59,0.06)',
        border: '1px solid rgba(196,151,59,0.15)',
        borderRadius: 100,
        color: 'rgba(196,151,59,0.6)',
        fontSize: 11, fontWeight: 900,
        letterSpacing: '.2em', textTransform: 'uppercase' as const,
        fontFamily: 'system-ui',
      }}>
        Submitting…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => { setStatus('idle'); setError(''); }}
          style={{
            padding: '14px 28px',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: 100,
            color: '#f87171',
            fontSize: 11, fontWeight: 900,
            letterSpacing: '.2em', textTransform: 'uppercase' as const,
            cursor: 'pointer', fontFamily: 'system-ui',
          }}
        >
          ⚠ Try Again
        </button>
        <p style={{ fontSize: 9, color: '#f87171', fontFamily: 'system-ui', textAlign: 'center', maxWidth: 220 }}>
          {error}
        </p>
      </div>
    );
  }

  // idle
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button
        onClick={handleGenerate}
        style={{
          padding: '14px 28px',
          background: 'rgba(196,151,59,0.08)',
          border: '1px solid rgba(196,151,59,0.25)',
          borderRadius: 100,
          color: GOLD,
          fontSize: 11, fontWeight: 900,
          letterSpacing: '.2em', textTransform: 'uppercase' as const,
          cursor: 'pointer', fontFamily: 'system-ui',
          whiteSpace: 'nowrap' as const,
        }}
      >
        🎬 Generate Movie
      </button>
      <p style={{
        fontSize: 9, color: 'rgba(245,236,215,0.25)',
        fontFamily: 'system-ui', textAlign: 'center',
        letterSpacing: '.12em', textTransform: 'uppercase' as const,
      }}>
        {imageCount} scenes · Grok animates · ~${estimatedCost} · 2-4 min
      </p>
    </div>
  );
};

export default GenerateMovieButton;
