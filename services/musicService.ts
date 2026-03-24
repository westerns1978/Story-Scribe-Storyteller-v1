// services/musicService.ts
// ============================================
// Music selection for CinematicReveal and StorybookViewer.
// Tracks hosted in Supabase scans/music/ — permanent, no CORS issues.
// All Kevin MacLeod — Creative Commons Attribution 4.0
// Credit: Kevin MacLeod (incompetech.com) Licensed under CC BY 4.0
// Falls back to silence gracefully — never throws.
// ============================================

export interface MusicTrack {
  id: number;
  title: string;
  artist: string;
  duration: number;
  url: string;
}

interface InternalTrack extends MusicTrack {
  keywords: string[];
}

const BASE = 'https://ldzzlndsspkyohvzfiiu.supabase.co/storage/v1/object/public/scans/music';

const CURATED_TRACKS: InternalTrack[] = [
  {
    id: 1,
    title: 'Heartwarming',
    artist: 'Kevin MacLeod',
    duration: 195,
    url: `${BASE}/Heartwarming.mp3`,
    keywords: ['hopeful', 'inspiring', 'uplifting', 'warm', 'family', 'love', 'joyful', 'bright', 'tender'],
  },
  {
    id: 2,
    title: 'Slow Burn',
    artist: 'Kevin MacLeod',
    duration: 180,
    url: `${BASE}/Slow%20Burn.mp3`,
    keywords: ['calm', 'peaceful', 'cinematic', 'slow', 'contemplative', 'reflective', 'nostalgic', 'memory', 'emotional'],
  },
  {
    id: 3,
    title: 'Autumn Day',
    artist: 'Kevin MacLeod',
    duration: 215,
    url: `${BASE}/Autumn%20Day.mp3`,
    keywords: ['melancholic', 'reflective', 'sad', 'loss', 'bittersweet', 'somber', 'passing', 'grief', 'solemn'],
  },
  {
    id: 4,
    title: 'Crossing the Divide',
    artist: 'Kevin MacLeod',
    duration: 200,
    url: `${BASE}/Crossing%20the%20Divide.mp3`,
    keywords: ['intimate', 'gentle', 'soft', 'quiet', 'tender', 'romantic', 'personal', 'spiritual', 'sacred'],
  },
  {
    id: 5,
    title: 'Arcadia',
    artist: 'Kevin MacLeod',
    duration: 190,
    url: `${BASE}/Arcadia.mp3`,
    keywords: ['cinematic', 'epic', 'orchestral', 'inspiring', 'triumph', 'courageous', 'resilient', 'dramatic', 'war', 'service'],
  },
  {
    id: 6,
    title: 'Long Road Ahead',
    artist: 'Kevin MacLeod',
    duration: 220,
    url: `${BASE}/Long%20Road%20Ahead.mp3`,
    keywords: ['journey', 'adventure', 'travel', 'determined', 'building', 'work', 'life', 'biographical', 'saga'],
  },
  {
    id: 7,
    title: 'Enchanted Journey',
    artist: 'Kevin MacLeod',
    duration: 205,
    url: `${BASE}/Enchanted%20Journey.mp3`,
    keywords: ['warm', 'loving', 'pet', 'gentle', 'companion', 'tender', 'family', 'playful', 'light'],
  },
];

// ─── Keyword scoring ──────────────────────────────────────────────────────────

function scoreTrack(track: InternalTrack, queryWords: string[]): number {
  const trackText = `${track.title} ${track.keywords.join(' ')}`.toLowerCase();
  return queryWords.filter(w => trackText.includes(w)).length;
}

function pickBestTrack(suggestion: string): MusicTrack {
  const words = suggestion.toLowerCase().split(/[\s,_-]+/).filter(w => w.length > 2);
  if (words.length === 0) return stripKeywords(CURATED_TRACKS[0]);

  const scored = CURATED_TRACKS.map(t => ({ track: t, score: scoreTrack(t, words) }));
  scored.sort((a, b) => b.score - a.score);

  // If no match, default to Slow Burn — works for almost any life story
  if (scored[0].score === 0) {
    return stripKeywords(CURATED_TRACKS[1]); // Slow Burn
  }
  return stripKeywords(scored[0].track);
}

function stripKeywords(t: InternalTrack): MusicTrack {
  const { keywords, ...rest } = t;
  return rest;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function findMusicFromSuggestion(suggestion: string): Promise<MusicTrack[]> {
  // All tracks are on our own Supabase CDN — no need to verify URLs
  // Just pick the best match and return it
  const best = pickBestTrack(suggestion);
  return [best];
}

export function toneToMusicQuery(tone: string): string {
  const map: Record<string, string> = {
    joyful: 'uplifting warm family love',
    hopeful: 'hopeful inspiring gentle warm',
    melancholic: 'melancholic reflective loss bittersweet',
    triumphant: 'cinematic epic orchestral inspiring triumph',
    tender: 'tender soft gentle intimate quiet',
    reflective: 'reflective nostalgic emotional memory',
    dramatic: 'dramatic cinematic epic',
    peaceful: 'peaceful calm contemplative slow',
    nostalgic: 'nostalgic memory reflective emotional',
    spiritual: 'spiritual sacred gentle intimate',
    somber: 'melancholic loss somber passing',
    warm: 'warm family love uplifting tender',
    courageous: 'cinematic epic orchestral triumph courageous',
    resilient: 'inspiring journey determined long road',
    loving: 'warm loving tender family gentle',
    adventurous: 'journey adventure long road saga',
    bittersweet: 'melancholic reflective bittersweet loss',
    pet: 'enchanted gentle warm loving companion',
  };

  const lower = tone.toLowerCase();
  for (const [key, query] of Object.entries(map)) {
    if (lower.includes(key)) return query;
  }
  return 'reflective nostalgic emotional memory';
}
