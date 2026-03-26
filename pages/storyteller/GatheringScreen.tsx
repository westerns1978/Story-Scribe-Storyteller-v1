import React, {useState, useCallback, useRef, useEffect} from 'react';
import CameraScanner, { ScanResult } from '../../components/CameraScanner';
import { enhancePhoto, STYLE_INFO } from '../../services/photoEnhancement';
// Custom SVG icons defined inline below — no external icon imports needed
import { NeuralAsset } from '../../types';
import { storageService } from '../../services/storageService';
import { fileToBase64, extractTextFromPdf } from '../../utils/fileUtils';
import IntakeAgent from '../../components/IntakeAgent';

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';
const CASCADE_URL = `${SUPABASE_URL}/functions/v1/story-cascade`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhotoAnalysis {
  age_estimate: string;
  era: string;
  ethnicity_hint: string;
  description: string;
  suggested_restoration: string;
}

interface PhotoFactExtraction {
  assetId: string;
  fileName: string;
  era: string;
  verifiedFacts: string[];   // e.g. ["Jersey number 34", "Team: Scranton Bulldogs"]
  visibleText: {
    jersey_number?: string | null;
    jersey_name?: string | null;
    team_name?: string | null;
    school_name?: string | null;
    location_signage?: string | null;
    date_stamp?: string | null;
    other_text?: string | null;
  };
}

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface GatheringScreenProps {
  subject: string;
  material: {
    transcript: string;
    artifacts: NeuralAsset[];
    importedTexts: { name: string; content: string }[];
  };
  onTalk: () => void;
  onPhotos: (assets: NeuralAsset[]) => void;
  onText: (name: string, content: string) => void;
  onRemoveArtifact: (id: string) => void;
  onRemoveText: (index: number) => void;
  onCreate: (photoAnalysis?: PhotoAnalysis, narrativeStyle?: string, musicQuery?: string, imagePalette?: string, petMode?: boolean, verifiedPhotoFacts?: string[]) => void;
  onExit: () => void;
  petMode?: boolean;
}

// ─── Custom SVG Icons ─────────────────────────────────────────────────────────
// Crafted specifically for Story Scribe — no emoji, no generic lucide defaults

const SvgMic: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="11" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
);

const SvgCamera: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
    <circle cx="12" cy="13" r="1.5" fill="currentColor" stroke="none" opacity="0.4" />
  </svg>
);

const SvgPhoto: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const SvgDocument: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="13" y2="17" />
  </svg>
);

const SvgFolder: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </svg>
);

const SvgSparkle: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2 L13.5 9 L20 12 L13.5 15 L12 22 L10.5 15 L4 12 L10.5 9 Z" opacity="0.9" />
    <path d="M19 3 L19.8 6 L23 7 L19.8 8 L19 11 L18.2 8 L15 7 L18.2 6 Z" opacity="0.5" />
    <path d="M5 16 L5.5 18 L7 18.5 L5.5 19 L5 21 L4.5 19 L3 18.5 L4.5 18 Z" opacity="0.4" />
  </svg>
);

const SvgTrash: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const SvgSpinner: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 2a10 10 0 0 1 10 10" opacity="0.9" />
    <path d="M12 2a10 10 0 0 0-10 10" opacity="0.2" />
  </svg>
);

const SvgChevronDown: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ── Tone icons — custom SVG glyphs, no emoji ───────────────────────────────

const ToneIconAI: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 3 L13.2 8.8 L19 12 L13.2 15.2 L12 21 L10.8 15.2 L5 12 L10.8 8.8 Z" opacity="0.85" />
    <circle cx="19.5" cy="4.5" r="1.2" opacity="0.45" />
    <circle cx="4.5" cy="19.5" r="0.8" opacity="0.3" />
  </svg>
);

const ToneIconSomber: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round">
    {/* Candle flame */}
    <path d="M12 3 C10 5 9 7 10 9 C10.5 10.5 13.5 10.5 14 9 C15 7 14 5 12 3Z" fill={color} opacity="0.7" stroke="none" />
    {/* Candle body */}
    <rect x="10" y="10" width="4" height="9" rx="0.5" fill={color} opacity="0.5" stroke="none" />
    {/* Base */}
    <line x1="8" y1="19" x2="16" y2="19" strokeWidth="1.5" />
    {/* Wax drip */}
    <path d="M10 14 Q9 15 9 16.5" strokeWidth="1" opacity="0.4" />
  </svg>
);

const ToneIconWarm: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round">
    {/* Sun */}
    <circle cx="12" cy="11" r="3.5" fill={color} opacity="0.6" stroke="none" />
    {/* Rays */}
    <line x1="12" y1="4" x2="12" y2="2.5" strokeWidth="1.5" />
    <line x1="17.5" y1="6.5" x2="18.5" y2="5.5" strokeWidth="1.5" />
    <line x1="20" y1="11" x2="21.5" y2="11" strokeWidth="1.5" />
    <line x1="6.5" y1="6.5" x2="5.5" y2="5.5" strokeWidth="1.5" />
    <line x1="4" y1="11" x2="2.5" y2="11" strokeWidth="1.5" />
    {/* Horizon line */}
    <path d="M4 18 Q8 14 12 15 Q16 16 20 18" strokeWidth="1.2" fill="none" opacity="0.6" />
  </svg>
);

const ToneIconBittersweet: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round">
    {/* Leaf */}
    <path d="M12 21 C12 21 5 16 5 10 C5 6 8 4 12 4 C16 4 19 6 19 10 C19 16 12 21 12 21Z" fill={color} opacity="0.25" />
    <path d="M12 21 C12 21 5 16 5 10 C5 6 8 4 12 4 C16 4 19 6 19 10 C19 16 12 21 12 21Z" />
    {/* Vein */}
    <line x1="12" y1="4" x2="12" y2="21" opacity="0.5" />
    <line x1="12" y1="10" x2="8" y2="14" opacity="0.35" />
    <line x1="12" y1="13" x2="16" y2="17" opacity="0.35" />
  </svg>
);

const ToneIconInspiring: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    {/* Eagle / wings spread */}
    <path d="M12 8 L3 12 L7 11 L7 16 L12 14 L17 16 L17 11 L21 12 Z" fill={color} opacity="0.5" />
    <path d="M12 8 L3 12 L7 11 L7 16 L12 14 L17 16 L17 11 L21 12 Z" strokeWidth="1" />
    {/* Head */}
    <circle cx="12" cy="6.5" r="2" fill={color} opacity="0.7" stroke="none" />
    {/* Tail */}
    <path d="M10 14 L9 20 M12 14 L12 20 M14 14 L15 20" strokeWidth="1" opacity="0.5" />
  </svg>
);

const ToneIconFunny: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round">
    {/* Face */}
    <circle cx="12" cy="12" r="9" opacity="0.2" fill={color} stroke={color} strokeWidth="1" />
    {/* Eyes — crinkled happy */}
    <path d="M8 9.5 Q9 8.5 10 9.5" strokeWidth="1.5" />
    <path d="M14 9.5 Q15 8.5 16 9.5" strokeWidth="1.5" />
    {/* Big smile */}
    <path d="M7.5 13.5 Q9 17 12 17 Q15 17 16.5 13.5" strokeWidth="1.5" />
    {/* Laugh lines */}
    <path d="M6 11 Q5 13 6.5 15" strokeWidth="1" opacity="0.4" />
    <path d="M18 11 Q19 13 17.5 15" strokeWidth="1" opacity="0.4" />
  </svg>
);

const ToneIconPeaceful: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round">
    {/* Leaf / branch */}
    <path d="M6 18 Q8 10 14 6 Q18 4 20 5 Q21 7 19 11 Q15 17 6 18Z" fill={color} opacity="0.2" />
    <path d="M6 18 Q8 10 14 6 Q18 4 20 5 Q21 7 19 11 Q15 17 6 18Z" />
    {/* Stem */}
    <path d="M6 18 Q5 20 4 22" strokeWidth="1.5" opacity="0.6" />
    {/* Veins */}
    <line x1="11" y1="9" x2="8" y2="14" opacity="0.4" strokeWidth="1" />
    <line x1="14" y1="8" x2="11" y2="13" opacity="0.4" strokeWidth="1" />
    {/* Dew drop */}
    <circle cx="18" cy="6" r="1" fill={color} opacity="0.5" stroke="none" />
  </svg>
);

const TONE_ICON_MAP: Record<string, React.FC<{ size?: number; color?: string }>> = {
  'ai-decide': ToneIconAI,
  'somber': ToneIconSomber,
  'warm': ToneIconWarm,
  'bittersweet': ToneIconBittersweet,
  'inspiring': ToneIconInspiring,
  'funny': ToneIconFunny,
  'peaceful': ToneIconPeaceful,
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CONNIE_PORTRAIT = 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/connie-ai.png';

const DECADES = ['1920s','1930s','1940s','1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s'];

const STORY_TONES = [
  {
    id: 'ai-decide',
    icon: 'ai',
    label: 'Let AI decide',
    subLabel: 'Connie feels the story',
    promptModifier: '',
    musicQuery: 'reflective nostalgic emotional',
    imagePalette: 'naturalistic, authentic period photography',
    color: '#C4973B',
  },
  {
    id: 'somber',
    icon: 'somber',
    label: 'Somber & Reverent',
    subLabel: 'Sacred. Dignified. Still.',
    promptModifier: 'EMOTIONAL TONE — SOMBER & REVERENT: Write with quiet dignity, restraint, and deep respect. This is a sacred remembrance. Choose words that honor the weight of a life. Avoid forced uplift. Let sorrow and love coexist without resolution.',
    musicQuery: 'melancholic solemn sacred moving',
    imagePalette: 'desaturated, muted tones, candlelit warmth, reverent shadows',
    color: '#7B9EA8',
  },
  {
    id: 'warm',
    icon: 'warm',
    label: 'Warm & Celebratory',
    subLabel: 'A life fully, joyfully lived.',
    promptModifier: 'EMOTIONAL TONE — WARM & CELEBRATORY: Write with warmth, joy, and a celebration of a life fully and beautifully lived. Let love radiate from every sentence. This story should make people smile through tears.',
    musicQuery: 'uplifting warm family hopeful love',
    imagePalette: 'warm golden tones, rich saturated color, glowing light',
    color: '#E8A24A',
  },
  {
    id: 'bittersweet',
    icon: 'bittersweet',
    label: 'Bittersweet',
    subLabel: 'Joy and loss, together.',
    promptModifier: 'EMOTIONAL TONE — BITTERSWEET: Honor both the joy and the grief, the love and the absence. Let the narrative hold both without forcing resolution. The sweetness and the ache belong together in this story.',
    musicQuery: 'bittersweet reflective nostalgic emotional piano',
    imagePalette: 'warm but faded, golden hour light, slightly desaturated, autumn palette',
    color: '#B07D54',
  },
  {
    id: 'inspiring',
    icon: 'inspiring',
    label: 'Inspiring & Triumphant',
    subLabel: 'They overcame. Honor it.',
    promptModifier: 'EMOTIONAL TONE — INSPIRING & TRIUMPHANT: Emphasize resilience, achievement, and enduring legacy. This person overcame. Write with the power of someone whose story deserves to be told from mountaintops.',
    musicQuery: 'cinematic epic orchestral inspiring triumph',
    imagePalette: 'dramatic contrast, epic scale, heroic lighting, deep shadows and highlights',
    color: '#8FA86E',
  },
  {
    id: 'funny',
    icon: 'funny',
    label: 'Lighthearted & Funny',
    subLabel: 'The laughs. The quirks.',
    promptModifier: "EMOTIONAL TONE — FUNNY & LIGHTHEARTED: Bring out the subject's humor, wit, and personality. Include funny moments, quirks, and the laughter they brought to others. This story should make people laugh out loud and remember the joy.",
    musicQuery: 'upbeat playful bright cheerful',
    imagePalette: 'bright, vivid, saturated colors, energetic composition',
    color: '#D4A843',
  },
  {
    id: 'peaceful',
    icon: 'peaceful',
    label: 'Quiet & Peaceful',
    subLabel: 'Slow. Serene. Gentle.',
    promptModifier: 'EMOTIONAL TONE — QUIET & PEACEFUL: Write with serenity, gentleness, and an unhurried pace. This story breathes slowly. Nature, stillness, and quiet moments take center stage.',
    musicQuery: 'peaceful serene nature ambient calm',
    imagePalette: 'soft pastels, muted greens and blues, gentle light, open spaces',
    color: '#7A9E8A',
  },
];

// ─── Toast ────────────────────────────────────────────────────────────────────


// ── Narrative Styles ──────────────────────────────────────────────────────────
const NARRATIVE_STYLES = [
  { id: 'cinematic',  label: 'Cinematic',        subLabel: 'Epic visuals. Sweeping scope.',       emoji: '🎬',
    modifier: 'NARRATIVE STYLE — CINEMATIC: Structure this like a documentary film. Open with a striking image or moment. Use scene-setting language. Build to emotional crescendo.' },
  { id: 'poetic',     label: 'Poetic',            subLabel: 'Lyrical. Metaphor-rich. Beautiful.',  emoji: '✍️',
    modifier: 'NARRATIVE STYLE — POETIC: Write with lyrical beauty. Use metaphor, imagery, and rhythm. Let the language itself feel like a gift. Every sentence worth reading twice.' },
  { id: 'adventure',  label: 'Adventure',         subLabel: 'A life as a journey. Bold chapters.', emoji: '🧭',
    modifier: 'NARRATIVE STYLE — ADVENTURE: Frame this life as a great journey. Bold chapters, challenges overcome, territories explored. Active, energetic language. Forward momentum.' },
  { id: 'intimate',   label: 'Intimate',          subLabel: 'Close. Personal. Like a letter.',     emoji: '💌',
    modifier: 'NARRATIVE STYLE — INTIMATE: Write as though speaking directly to the family. Personal, warm, like a private letter — not a public eulogy.' },
  { id: 'oral',       label: 'Oral Tradition',    subLabel: 'Storyteller. Around the fire.',       emoji: '🔥',
    modifier: 'NARRATIVE STYLE — ORAL TRADITION: Write as a master storyteller passing this story to grandchildren. Use "she used to say..." and "the family always remembered..." Draw on the spoken tradition.' },
  { id: 'nonlinear',  label: 'Non-Linear',        subLabel: 'Memory-like. Weaves through time.',  emoji: '🌀',
    modifier: 'NARRATIVE STYLE — NON-LINEAR: Move through time the way memory does — not chronologically, but emotionally. Begin near the end, circle back. Let a single object or moment connect decades. Mirror how we actually remember those we love.' },
];

const Toast: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const colors = {
    success: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', text: '#6ee7b7' },
    error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#fca5a5' },
    info: { bg: 'rgba(196,151,59,0.12)', border: 'rgba(196,151,59,0.3)', text: '#fcd34d' },
  };
  const c = colors[toast.type];
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ background: c.bg, borderColor: c.border, color: c.text }}
      className="flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-md shadow-2xl text-xs font-black uppercase tracking-widest">
      {toast.message}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const GatheringScreen: React.FC<GatheringScreenProps> = ({
  subject, material, onTalk, onPhotos, onText, onRemoveArtifact, onRemoveText, onCreate, onExit, petMode = false
}) => {

  const [mode, setMode] = useState<'quick' | 'guided'>('quick');
  const [quickNote, setQuickNote] = useState('');
  const [extractedPhotoFacts, setExtractedPhotoFacts] = useState<PhotoFactExtraction[]>([]);
  const [storyTone, setStoryTone] = useState('ai-decide');
  const [narrativeStyle, setNarrativeStyle] = useState('cinematic');
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysis | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState(0); // count of in-flight OCR/analysis calls
  const [processingStatus, setProcessingStatus] = useState(''); // human-readable status
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [decadeMap, setDecadeMap] = useState<Record<string, string>>({});
  const [activeDecadeId, setActiveDecadeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Connie AI suggestion state ────────────────────────────────────────────
  interface ConnieSuggestion {
    type: 'tone' | 'followup' | 'opening' | 'missing';
    text: string;           // Connie's message
    action?: string;        // e.g. tone id to auto-set
    actionLabel?: string;   // e.g. "Set Bittersweet"
    appendText?: string;    // text to append to quickNote
  }
  const [connieSuggestion, setConnieSuggestion] = useState<ConnieSuggestion | null>(null);
  const [connieGreeting, setConnieGreeting] = useState<string>('');
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const lastAnalyzedText = useRef('');

  const activeTone = STORY_TONES.find(t => t.id === storyTone) || STORY_TONES[0];

  // ── Connie greeting on mount ─────────────────────────────────────────────
  useEffect(() => {
    const greetings = [
      `I'm here to help preserve ${subject}'s story. Tell me about them — anything at all.`,
      `Every story matters. Tell me who ${subject} was, in your own words.`,
      `Let's make sure ${subject}'s story is never forgotten. What should I know about them?`,
    ];
    setConnieGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
  }, [subject]);

  // ── Fetch Connie suggestion via Supabase (NOT direct Anthropic — fixes CORS error) ──
  const fetchConnieSuggestion = useCallback(async (text: string) => {
    if (!text.trim() || text.trim().length < 30) return;
    if (text === lastAnalyzedText.current) return;
    lastAnalyzedText.current = text;
    setIsFetchingSuggestion(true);
    setSuggestionDismissed(false);
    try {
      const systemPrompt = `You are Connie, a warm memory curator for Story Scribe. Read what the family has written about "${subject}" and offer ONE warm, specific suggestion. Be human — never clinical.
Respond ONLY with JSON: {"type":"tone"|"followup"|"opening"|"missing","text":"1-2 sentences","action":"tone id if tone","actionLabel":"button label","appendText":"follow-up question if followup"}
Tone IDs: ai-decide,somber,warm,bittersweet,inspiring,funny,peaceful
- Death/grief/loss → somber or bittersweet
- Joyful/achievements → warm or inspiring  
- Humor/quirks → funny
- Missing birth year or hometown → missing
- Rich detail present → opening line suggestion
One suggestion only.`;
      const res = await fetch(CASCADE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({
          action: 'connie_chat',
          system_prompt: systemPrompt,
          subject,
          messages: [{ role: 'user', parts: [{ text: `About "${subject}": "${text.substring(0, 500)}"` }] }],
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const raw = (data.text || '').replace(/```json\s*/gi, '').replace(/```/gi, '').trim();
      if (raw) setConnieSuggestion(JSON.parse(raw));
    } catch (e) {
      console.warn('[Connie] Suggestion failed:', e);
    } finally {
      setIsFetchingSuggestion(false);
    }
  }, [subject]);

  // ── Debounce suggestion fetch on quickNote change ─────────────────────────
  const handleQuickNoteChange = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSuggestionDismissed(false);
    debounceRef.current = setTimeout(() => fetchConnieSuggestion(text), 2000);
  }, [fetchConnieSuggestion]);

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Photo OCR + fact extraction (upgraded — extracts jersey #, school, dates, text) ──
  const extractPhotoFacts = async (file: File, assetId: string): Promise<PhotoFactExtraction | null> => {
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const response = await fetch(`${SUPABASE_URL}/functions/v1/story-cascade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: 'analyze_photo', image_base64: base64, mime_type: file.type })
      });
      if (!response.ok) return null;
      const data = await response.json();
      const analysis = data.analysis || {};
      return {
        assetId,
        fileName: file.name,
        era: analysis.estimated_era || '',
        verifiedFacts: analysis.verified_facts || [],
        visibleText: analysis.visible_text || {},
      };
    } catch { return null; }
  };

  // Legacy wrapper for era detection toast
  const analyzeUploadedPhoto = async (file: File): Promise<PhotoAnalysis | null> => {
    return null; // replaced by extractPhotoFacts
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsUploading(true);
    const files = Array.from(e.target.files);
    const newAssets: NeuralAsset[] = [];

    for (const file of files) {
      try {
        if (file.type.startsWith('image/')) {
          const asset = await storageService.uploadFile(file, { title: file.name, tags: ['gathering'] });
          newAssets.push(asset);
          setRestoringIds(prev => new Set(prev).add(asset.id));
          (async () => {
            try {
              const b64 = await new Promise<string>((resolve, reject) => {
                const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file);
              });
              const enhanced = await enhancePhoto(b64, 'restore', () => {});
              onPhotos([{ ...asset, id: `restored-${asset.id}`, public_url: enhanced.imageData, metadata: { ...asset.metadata, restored: true } }]);
              showToast('Photo restored ✓', 'success');
            } catch { showToast('Restore skipped', 'info'); }
            finally { setRestoringIds(prev => { const n = new Set(prev); n.delete(asset.id); return n; }); }
          })();
          // Track analysis as pending so button stays disabled
          setPendingAnalysis(n => n + 1);
          setProcessingStatus('Analyzing photo...');
          extractPhotoFacts(file, asset.id).then(analysis => {
            if (analysis) {
              setExtractedPhotoFacts(prev => [...prev, analysis]);
              // Write era + facts onto asset metadata so App.tsx can
              // build the uploadedPhotos array for beat-level grounding
              onPhotos([{
                ...asset,
                metadata: {
                  ...asset.metadata,
                  era: analysis.era,
                  estimated_era: analysis.era,
                  verifiedFacts: analysis.verifiedFacts,
                }
              }]);
              if (analysis.era) showToast(`${analysis.era} detected`, 'info');
              if (analysis.verifiedFacts.length > 0) {
                showToast(`Found: ${analysis.verifiedFacts.slice(0, 2).join(' · ')}`, 'success');
              }
            }
          }).finally(() => {
            setPendingAnalysis(n => Math.max(0, n - 1));
            setProcessingStatus('');
          });
        } else if (file.type === 'application/pdf' || file.type === 'text/plain') {
          const content = file.type === 'application/pdf' ? await extractTextFromPdf(file) : await file.text();
          onText(file.name, content);
          showToast(`Document added — ${file.name}`, 'success');
        }
      } catch { showToast(`Failed: ${file.name}`, 'error'); }
    }
    if (newAssets.length > 0) onPhotos(newAssets);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(false);
  };

  const handleScanComplete = async (scan: ScanResult) => {
    if (scan.type === 'photo' || !scan.transcribedText) {
      const b = atob(scan.base64), ab = new ArrayBuffer(b.length), ia = new Uint8Array(ab);
      for (let i = 0; i < b.length; i++) ia[i] = b.charCodeAt(i);
      const file = new File([new Blob([ab], { type: 'image/jpeg' })], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setIsUploading(true);
      try { const a = await storageService.uploadFile(file, { title: `Scanned ${scan.documentType || 'Photo'}`, tags: ['scan'] }); onPhotos([a]); showToast('Scan added', 'success'); }
      catch { showToast('Scan failed', 'error'); } finally { setIsUploading(false); }
    } else {
      const parts = [`[Scanned ${scan.documentType || 'Document'} — ${scan.era || 'Unknown Era'}]`];
      if (scan.description) parts.push(scan.description);
      if (scan.transcribedText) parts.push(`\nTRANSCRIPT:\n${scan.transcribedText}`);
      if (scan.keyFacts?.length) parts.push(`\nKEY FACTS: ${scan.keyFacts.join(' · ')}`);
      onText(`Scan: ${scan.documentType || 'Document'}`, parts.join('\n'));
      showToast('Document transcribed', 'success');
    }
  };

  const setDecade = (assetId: string, decade: string) => {
    setDecadeMap(prev => ({ ...prev, [assetId]: decade }));
    setActiveDecadeId(null);
  };

  const handleGenerate = () => {
    if (quickNote.trim()) onText('Description', quickNote.trim());
    if (Object.keys(decadeMap).length > 0) {
      const ctx = material.artifacts.filter(a => decadeMap[a.id])
        .map(a => `[Photo from ${decadeMap[a.id]}: ${a.metadata?.title || a.id}]`).join('\n');
      if (ctx) onText('Chronological context', `PHOTO TIMELINE:\n${ctx}`);
    }

    // Inject verified photo facts as structured text for cascade
    const allVerifiedFacts = extractedPhotoFacts.flatMap(epf => epf.verifiedFacts);
    if (allVerifiedFacts.length > 0) {
      onText('Verified Photo Facts', `[VERIFIED FACTS EXTRACTED FROM UPLOADED PHOTOS — USE VERBATIM]\n${allVerifiedFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`);
    }

    const activeNarrStyle = NARRATIVE_STYLES.find(s => s.id === narrativeStyle) || NARRATIVE_STYLES[0];
    const combinedStyle = [activeNarrStyle.modifier, activeTone.promptModifier]
      .filter(Boolean).join('\n\n');
    onCreate(photoAnalysis || undefined, combinedStyle, activeTone.musicQuery, activeTone.imagePalette, petMode, allVerifiedFacts);
  };

  const totalMaterials = material.artifacts.length + material.importedTexts.length +
    (material.transcript ? 1 : 0) + (quickNote.trim() ? 1 : 0);
  const isProcessing = isUploading || pendingAnalysis > 0;
  const canGenerate = totalMaterials > 0 && !isProcessing;

  // ── Shared file input (for quick mode photo zone) ─────────────────────────
  const QuickPhotoZone = () => (
    <label className="cursor-pointer block group">
      <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf,text/plain" className="hidden" onChange={handleFileUpload} />
      {material.artifacts.length === 0 ? (
        <div className="border border-dashed border-white/8 rounded-3xl py-10 flex flex-col items-center gap-3 transition-all group-hover:border-white/18"
          style={{ background: 'rgba(255,255,255,0.015)' }}>
          {isUploading
            ? <SvgSpinner className="w-7 h-7 animate-spin" style={{ color: activeTone.color }} />
            : <>
                <SvgPhoto className="w-10 h-10 opacity-20" style={{ color: activeTone.color }} />
                <p className="text-sm text-white/25 font-bold" style={{ fontFamily: 'Georgia, serif' }}>Drop a photo, PDF, or document</p>
                <p className="text-[9px] text-white/15 uppercase tracking-widest font-black">JPG · PNG · PDF · TXT</p>
              </>
          }
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {material.artifacts.slice(0, 7).map(a => (
            <div key={a.id} className="relative aspect-square rounded-xl overflow-hidden group/t">
              <img src={a.public_url} alt="" className="w-full h-full object-cover" />
              {restoringIds.has(a.id) && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><SvgSpinner className="w-4 h-4 animate-spin" style={{ color: '#fbbf24' }} /></div>}
              {/* OCR facts badge */}
              {(() => {
                const facts = extractedPhotoFacts.find(f => f.assetId === a.id || f.assetId === `restored-${a.id}`);
                const hasText = facts && (facts.visibleText.jersey_number || facts.visibleText.team_name || facts.visibleText.school_name || facts.visibleText.date_stamp);
                return hasText ? (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 6px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', fontSize: 8,
                    fontFamily: 'system-ui', fontWeight: 700, color: activeTone.color, letterSpacing: '0.05em' }}>
                    {facts!.visibleText.jersey_number && `#${facts!.visibleText.jersey_number} `}
                    {facts!.visibleText.team_name && facts!.visibleText.team_name.substring(0, 16)}
                  </div>
                ) : null;
              })()}
              <button onClick={e => { e.preventDefault(); onRemoveArtifact(a.id); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600/80 flex items-center justify-center opacity-0 group-hover/t:opacity-100 transition-all">
                <SvgTrash className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
          <div className="aspect-square rounded-xl border border-dashed border-white/10 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <span className="text-white/20 text-xl font-black">+</span>
          </div>
        </div>
      )}
    </label>
  );

  // ── Step state ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const STEP_COUNT = 4;

  const goTo = (s: number) => setStep(Math.max(0, Math.min(STEP_COUNT - 1, s)));

  // ── Tone color helpers ────────────────────────────────────────────────────────
  const tc = activeTone.color; // shorthand

  // ── Background warmth: deep warm brown, not pitch black ──────────────────────
  const BG       = '#13100C';
  const BG_PANEL = '#1A1510';
  const BG_CARD  = '#211A13';
  const INK      = 'rgba(255,248,235,0.82)';
  const INK_DIM  = 'rgba(255,248,235,0.38)';
  const INK_FAINT= 'rgba(255,248,235,0.14)';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', overflow:'hidden',
      background: BG, fontFamily:'Georgia, serif', color: INK, position:'relative' }}>

      {/* Grain texture overlay */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")`,
        backgroundSize:'256px' }} />

      {/* Warm ambient glow from top-right */}
      <div style={{ position:'absolute', top:0, right:0, width:700, height:500, pointerEvents:'none', zIndex:0,
        background:`radial-gradient(ellipse at top right, ${tc}18 0%, transparent 65%)`,
        transition:'background 0.8s ease' }} />

      {/* Toasts */}
      <div style={{ position:'fixed', top:24, right:24, zIndex:500, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
        {toasts.map(t => <Toast key={t.id} toast={t} onClose={() => dismissToast(t.id)} />)}
      </div>

      {/* ── HEADER ── */}
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 32px', borderBottom:`1px solid ${INK_FAINT}`, flexShrink:0, zIndex:10,
        background:'rgba(19,16,12,0.92)', backdropFilter:'blur(12px)' }}>

        {/* Connie identity */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ position:'relative' }}>
            <img src={CONNIE_PORTRAIT} alt="Connie"
              style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover',
                boxShadow:`0 0 0 2px ${tc}50, 0 0 20px ${tc}25` }} />
            <div style={{ position:'absolute', bottom:0, right:0, width:10, height:10,
              borderRadius:'50%', background:'#4ade80', border:`2px solid ${BG}` }} />
          </div>
          <div>
            <div style={{ fontSize:9, fontFamily:'system-ui, sans-serif', fontWeight:900,
              letterSpacing:'0.35em', textTransform:'uppercase', color: INK_DIM, marginBottom:1 }}>
              Story Scribe
            </div>
            <div style={{ fontSize:15, fontWeight:'bold', color: INK }}>
              {subject}'s Story
            </div>
          </div>
        </div>

        {/* Step dots — minimal, centered */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {['Story','Photos','Voice','Feeling'].map((label, i) => (
            <button key={i} onClick={() => goTo(i)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
                borderRadius:20, border:'none', cursor:'pointer', transition:'all 0.3s',
                background: i === step ? `${tc}20` : 'transparent' }}>
              <div style={{ width: i === step ? 7 : 5, height: i === step ? 7 : 5,
                borderRadius:'50%', transition:'all 0.3s',
                background: i < step ? tc : i === step ? tc : INK_FAINT,
                boxShadow: i === step ? `0 0 8px ${tc}` : 'none' }} />
              <span style={{ fontSize:9, fontFamily:'system-ui', fontWeight:900,
                letterSpacing:'0.3em', textTransform:'uppercase', transition:'all 0.3s',
                color: i === step ? tc : i < step ? INK_DIM : INK_FAINT }}>
                {label}
              </span>
            </button>
          ))}
        </div>

        <button onClick={onExit}
          style={{ padding:'8px 20px', borderRadius:20, border:`1px solid ${INK_FAINT}`,
            background:'transparent', color: INK_DIM, fontSize:11, fontFamily:'system-ui',
            fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer' }}>
          Cancel
        </button>
      </header>

      {/* Progress bar */}
      <div style={{ height:2, background:'rgba(255,248,235,0.04)', flexShrink:0, zIndex:9 }}>
        <div style={{ height:'100%', transition:'width 0.5s ease',
          width:`${((step + 1) / STEP_COUNT) * 100}%`,
          background:`linear-gradient(to right, ${tc}, ${tc}55)` }} />
      </div>

      {/* ── STEP PANELS ── */}
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        <div style={{ display:'flex', height:'100%',
          transform:`translateX(calc(-${step} * 100vw))`,
          width:`${STEP_COUNT * 100}vw`,
          transition:'transform 0.45s cubic-bezier(0.4,0,0.2,1)' }}>

          {/* ════════════════════════════════════════════════════════════
               STEP 0 — THE STORY (Letter to Connie)
          ════════════════════════════════════════════════════════════ */}
          <div style={{ width:'100vw', height:'100%', overflowY:'auto', flexShrink:0 }}>
            <div style={{ maxWidth:780, margin:'0 auto', padding:'48px 48px 32px' }}>

              <IntakeAgent
                subject={subject}
                transcript={material.transcript}
                photoCount={material.artifacts.length}
                photoFacts={extractedPhotoFacts.flatMap(pf => pf.verifiedFacts)}
                importedTexts={material.importedTexts}
                petMode={petMode}
                quickNote={quickNote}
                onTalkToConnie={onTalk}
                onSuggestionApply={(appendText) => {
                  setQuickNote(prev => prev + (prev.trim() ? '\n\n' : '') + appendText);
                }}
              />

              {/* Connie letter header */}
              <div style={{ display:'flex', alignItems:'flex-start', gap:20, marginBottom:32 }}>
                <img src={CONNIE_PORTRAIT} alt="Connie"
                  style={{ width:56, height:56, borderRadius:'50%', objectFit:'cover', flexShrink:0,
                    boxShadow:`0 0 0 3px ${tc}40, 0 0 24px ${tc}20`, marginTop:4 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, fontFamily:'system-ui', fontWeight:900,
                    letterSpacing:'0.4em', textTransform:'uppercase', color: tc, marginBottom:10 }}>
                    Connie
                  </div>
                  <div style={{ fontSize:22, fontStyle:'italic', lineHeight:1.5, color: INK,
                    fontWeight:'normal' }}>
                    {connieGreeting || `Every story matters. Tell me who ${subject} was, in your own words.`}
                  </div>
                </div>
              </div>

              {/* The writing area — large, warm, inviting */}
              <div style={{ position:'relative', marginBottom:24 }}>
                <textarea
                  value={quickNote}
                  onChange={e => { setQuickNote(e.target.value); handleQuickNoteChange(e.target.value); }}
                  placeholder={`Start anywhere. A memory, a trait, a moment you never want to forget about ${subject}...`}
                  style={{ width:'100%', minHeight:280, padding:'28px 32px', borderRadius:20,
                    border:`1.5px solid ${quickNote.length > 30 ? tc + '50' : INK_FAINT}`,
                    background: BG_CARD,
                    color: INK, fontSize:18, lineHeight:1.85, resize:'vertical',
                    outline:'none', transition:'border-color 0.3s',
                    fontFamily:'Georgia, serif',
                    boxSizing:'border-box',
                    boxShadow: quickNote.length > 30 ? `0 0 40px ${tc}10` : 'none' }}
                />
                {/* Connie thinking dots */}
                {isFetchingSuggestion && (
                  <div style={{ position:'absolute', bottom:16, right:20, display:'flex', gap:5 }}>
                    {[0,120,240].map(d => (
                      <div key={d} style={{ width:5, height:5, borderRadius:'50%', background: tc,
                        animation:'bounce 1s ease infinite', animationDelay:`${d}ms` }} />
                    ))}
                  </div>
                )}
                {/* Character count when getting long */}
                {quickNote.length > 100 && (
                  <div style={{ position:'absolute', bottom:16, left:20, fontSize:10,
                    fontFamily:'system-ui', color: INK_FAINT, fontStyle:'italic' }}>
                    {quickNote.length} characters — Connie is listening
                  </div>
                )}
              </div>

              {/* Connie suggestion */}
              {connieSuggestion && !suggestionDismissed && !isFetchingSuggestion && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:24,
                  padding:'20px 24px', borderRadius:16,
                  background: BG_PANEL, border:`1px solid ${tc}30` }}>
                  <img src={CONNIE_PORTRAIT} alt="Connie"
                    style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:9, fontFamily:'system-ui', fontWeight:900,
                      letterSpacing:'0.4em', textTransform:'uppercase', color: tc, marginBottom:8 }}>
                      {connieSuggestion.type === 'tone' && 'Tone suggestion'}
                      {connieSuggestion.type === 'followup' && 'Connie wonders...'}
                      {connieSuggestion.type === 'opening' && 'Opening line'}
                      {connieSuggestion.type === 'missing' && 'Worth adding'}
                    </div>
                    <div style={{ fontSize:16, fontStyle:'italic', color: INK, lineHeight:1.6, marginBottom:14 }}>
                      "{connieSuggestion.text}"
                    </div>
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                      {connieSuggestion.action && connieSuggestion.actionLabel && (
                        <button onClick={() => { setStoryTone(connieSuggestion!.action!); setSuggestionDismissed(true); }}
                          style={{ padding:'7px 18px', borderRadius:20, border:`1px solid ${tc}50`,
                            background:`${tc}18`, color: tc, fontSize:10, fontFamily:'system-ui',
                            fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer' }}>
                          {connieSuggestion.actionLabel}
                        </button>
                      )}
                      {connieSuggestion.appendText && (
                        <button onClick={() => {
                          setQuickNote(quickNote.trim() + (quickNote.trim() ? '\n\n' : '') + connieSuggestion!.appendText!);
                          setSuggestionDismissed(true);
                        }} style={{ padding:'7px 18px', borderRadius:20, border:`1px solid ${INK_FAINT}`,
                          background:'transparent', color: INK_DIM, fontSize:10, fontFamily:'system-ui',
                          fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer' }}>
                          Add this
                        </button>
                      )}
                      <button onClick={() => setSuggestionDismissed(true)}
                        style={{ padding:'7px 14px', border:'none', background:'transparent',
                          color: INK_FAINT, fontSize:10, fontFamily:'system-ui', fontWeight:700,
                          letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer' }}>
                        Skip
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setSuggestionDismissed(true)}
                    style={{ color: INK_FAINT, background:'none', border:'none', cursor:'pointer',
                      fontSize:14, lineHeight:1, padding:4 }}>✕</button>
                </div>
              )}


              {/* ── Life Chapter Prompt Chips ───────────────────────────────── */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 9, fontFamily: 'system-ui', fontWeight: 900,
                  letterSpacing: '0.4em', textTransform: 'uppercase', color: INK_FAINT,
                  marginBottom: 14 }}>
                  Tap a chapter to add it
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    ...(petMode ? [
                      { emoji: '🐾', label: 'How they arrived', prompt: `\n\nHow ${subject} came into the family: Was it planned or a surprise? What were those first days like?` },
                      { emoji: '✨', label: 'Personality', prompt: `\n\nPersonality & quirks: What made ${subject} unique? Their habits and the things that made everyone laugh.` },
                      { emoji: '❤️', label: 'Bonds', prompt: `\n\nBonds: Who were their favorite people? How did they show love? Who did they always choose to sit with?` },
                      { emoji: '🌅', label: 'Daily life', prompt: `\n\nDaily rituals: A typical day for ${subject}. Morning routines, favorite spots, rituals they never skipped.` },
                      { emoji: '🎾', label: 'Favorite things', prompt: `\n\nFavorite things: Toys, foods, places. The things that made ${subject}'s whole body light up.` },
                      { emoji: '🧭', label: 'Adventures', prompt: `\n\nAdventures together: Places you went, trips you took, the outdoors you shared with ${subject}.` },
                      { emoji: '🤣', label: 'Funny moments', prompt: `\n\nFunny moments: The things ${subject} did that still make you laugh out loud.` },
                      { emoji: '🌙', label: 'Later years', prompt: `\n\nLater years: How ${subject} changed as they got older. The quiet grace of their senior years.` },
                      { emoji: '🕯️', label: 'Goodbye', prompt: `\n\nSaying goodbye: The last good days. What ${subject} gave you that you carry still.` },
                      { emoji: '💬', label: 'What they gave you', prompt: `\n\nWhat ${subject} gave you: The thing they taught without words. The hole they left. What life is like now.` },
                    ] : [
                    { emoji: '🧒', label: 'Childhood',        prompt: `\n\nChildhood & Early Years: Where did ${subject} grow up? What was home like? Earliest memories, family life, school, friendships, and the things that shaped who they became.` },
                    { emoji: '❤️', label: 'Love & Marriage',   prompt: `\n\nLove & Marriage: How did ${subject} meet their partner? What was the courtship like? What made the relationship special? The wedding, the early years together.` },
                    { emoji: '👶', label: 'Kids & Family',     prompt: `\n\nChildren & Family Life: What kind of parent was ${subject}? Favorite memories with the kids. Family traditions, vacations, holiday rituals. What they taught through example.` },
                    { emoji: '💼', label: 'Work & Career',     prompt: `\n\nWork & Career: What did ${subject} do for a living? Were they passionate about it? Proudest professional moments, coworkers they loved, how work shaped their identity.` },
                    { emoji: '🌅', label: 'Retirement',        prompt: `\n\nRetirement & Later Years: How did ${subject} spend their retirement? New hobbies, travel, time with grandchildren. What did they finally have time for?` },
                    { emoji: '🎣', label: 'Hobbies',           prompt: `\n\nHobbies & Passions: What did ${subject} love to do? Hobbies, collections, sports, crafts, gardens — the things they did just for joy.` },
                    { emoji: '👴', label: 'Grandkids',         prompt: `\n\nGrandchildren & Legacy: What kind of grandparent was ${subject}? Favorite things they did together. What wisdom or traditions did they pass down?` },
                    { emoji: '🏆', label: 'Accomplishments',   prompt: `\n\nAccomplishments & Proud Moments: What achievements made ${subject} most proud? Recognition, milestones, things they built or created or contributed.` },
                    { emoji: '🌍', label: 'Adventures',        prompt: `\n\nAdventures & Travel: Places ${subject} went, big or small. Road trips, vacations, the trip they always talked about. Where did life take them?` },
                    { emoji: '🤣', label: 'Funny Stories',     prompt: `\n\nFunny Stories & Quirks: The stories the family always tells at dinner. Their sense of humor, their quirks, the things that made everyone laugh.` },
                    { emoji: '🤫', label: 'Little-Known Facts', prompt: `\n\nLittle-Known Facts & Surprises: Things most people didn't know about ${subject}. Hidden talents, surprising history, unexpected chapters of their life.` },
                    { emoji: '💬', label: 'Their Words',       prompt: `\n\nIn Their Own Words: Sayings they always used. Life advice they gave. How they described themselves. Things they believed deeply.` },
                    ]),
                  ].map(({ emoji, label, prompt }) => (
                    <button
                      key={label}
                      onClick={() => {
                        // Only add if not already present
                        if (!quickNote.includes(label)) {
                          setQuickNote(prev => prev + prompt);
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', borderRadius: 20,
                        border: `1px solid ${quickNote.includes(label) ? tc + '60' : INK_FAINT}`,
                        background: quickNote.includes(label) ? `${tc}18` : 'transparent',
                        color: quickNote.includes(label) ? tc : INK_DIM,
                        fontSize: 11, fontFamily: 'system-ui', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <span>{emoji}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:8 }}>
                <button onClick={() => goTo(1)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 28px',
                    borderRadius:24, border:`1px solid ${tc}45`,
                    background:`${tc}15`, color: tc,
                    fontSize:11, fontFamily:'system-ui', fontWeight:700,
                    letterSpacing:'0.25em', textTransform:'uppercase', cursor:'pointer',
                    transition:'all 0.2s' }}>
                  Photos & Documents
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="7" x2="12" y2="7"/><polyline points="8,3 12,7 8,11"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════
               STEP 1 — PHOTOS & DOCUMENTS
          ════════════════════════════════════════════════════════════ */}
          <div style={{ width:'100vw', height:'100%', overflowY:'auto', flexShrink:0 }}>
            <div style={{ maxWidth:780, margin:'0 auto', padding:'48px 48px 32px' }}>

              <div style={{ marginBottom:36 }}>
                <div style={{ fontSize:10, fontFamily:'system-ui', fontWeight:900,
                  letterSpacing:'0.4em', textTransform:'uppercase', color: tc, marginBottom:10 }}>
                  Step 2 of 4
                </div>
                <div style={{ fontSize:36, fontWeight:'bold', color: INK, lineHeight:1.1, marginBottom:8 }}>
                  Photos & Documents
                </div>
                <div style={{ fontSize:16, fontStyle:'italic', color: INK_DIM }}>
                  Photos, letters, records — Connie reads everything and weaves it in.
                </div>
              </div>

              {/* Upload zone */}
              {material.artifacts.length === 0 ? (
                <label style={{ display:'block', cursor:'pointer', marginBottom:20 }}>
                  <input type="file" multiple accept="image/*,application/pdf,text/plain"
                    style={{ display:'none' }} onChange={handleFileUpload} />
                  <div style={{ border:`2px dashed ${tc}30`, borderRadius:24,
                    padding:'60px 40px', textAlign:'center',
                    background:`${tc}05`, transition:'all 0.2s' }}>
                    {isUploading
                      ? <SvgSpinner className="w-8 h-8" style={{ color: tc, margin:'0 auto 16px' }} />
                      : <SvgFolder className="w-14 h-14" style={{ color: tc, opacity:0.3, margin:'0 auto 20px' }} />
                    }
                    <div style={{ fontSize:18, color: INK_DIM, marginBottom:6 }}>
                      Drop photos, PDFs, or documents here
                    </div>
                    <div style={{ fontSize:11, fontFamily:'system-ui', color: INK_FAINT,
                      letterSpacing:'0.3em', textTransform:'uppercase' }}>
                      JPG · PNG · PDF · TXT
                    </div>
                  </div>
                </label>
              ) : (
                <div style={{ marginBottom:20 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:12, marginBottom:12 }}>
                    {material.artifacts.map((a, i) => (
                      <div key={a.id} style={{ position:'relative', borderRadius:16,
                        overflow:'hidden', aspectRatio:'1',
                        border:`1px solid ${INK_FAINT}` }}>
                        <img src={a.public_url} alt=""
                          style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        {/* Verified facts overlay */}
                        {(() => {
                          const facts = extractedPhotoFacts.find(f => f.assetId === a.id);
                          if (!facts || facts.verifiedFacts.length === 0) return null;
                          return (
                            <div style={{ position:'absolute', top:0, left:0, right:0,
                              padding:'6px 8px', background:'linear-gradient(rgba(0,0,0,0.8), transparent)',
                              display:'flex', flexWrap:'wrap', gap:3 }}>
                              {facts.verifiedFacts.slice(0, 3).map((fact, fi) => (
                                <span key={fi} style={{ fontSize:8, fontFamily:'system-ui', fontWeight:800,
                                  color: tc, letterSpacing:'0.05em', lineHeight:1.3,
                                  background:`${tc}20`, padding:'2px 5px', borderRadius:4 }}>
                                  {fact.length > 24 ? fact.substring(0, 24) + '…' : fact}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                        <div style={{ position:'absolute', bottom:0, left:0, right:0,
                          padding:'8px 10px', background:'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                          {activeDecadeId === a.id ? (
                            <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                              {DECADES.map(d => (
                                <button key={d} onClick={() => setDecade(a.id, d)}
                                  style={{ padding:'2px 7px', borderRadius:8,
                                    border:'1px solid rgba(255,255,255,0.25)',
                                    background:'rgba(255,255,255,0.1)', color:'white',
                                    fontSize:9, fontFamily:'system-ui', fontWeight:700,
                                    cursor:'pointer' }}>
                                  {d}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button onClick={() => setActiveDecadeId(a.id)}
                              style={{ border:'none', background:'none', cursor:'pointer',
                                fontSize:9, fontFamily:'system-ui', fontWeight:700,
                                letterSpacing:'0.2em', textTransform:'uppercase',
                                color: decadeMap[a.id] ? tc : 'rgba(255,255,255,0.45)' }}>
                              {decadeMap[a.id] || '+ decade'}
                            </button>
                          )}
                        </div>
                        <button onClick={() => onRemoveArtifact(a.id)}
                          style={{ position:'absolute', top:6, right:6, width:22, height:22,
                            borderRadius:'50%', background:'rgba(0,0,0,0.6)',
                            border:'none', cursor:'pointer', display:'flex',
                            alignItems:'center', justifyContent:'center',
                            color:'rgba(255,255,255,0.6)', fontSize:10 }}>✕</button>
                      </div>
                    ))}
                    <label style={{ cursor:'pointer', aspectRatio:'1', borderRadius:16,
                      border:`2px dashed ${INK_FAINT}`, display:'flex',
                      alignItems:'center', justifyContent:'center',
                      color: INK_FAINT, fontSize:28, fontWeight:300 }}>
                      <input type="file" multiple accept="image/*,application/pdf,text/plain"
                        style={{ display:'none' }} onChange={handleFileUpload} />
                      +
                    </label>
                  </div>
                </div>
              )}

              {/* Scan button */}
              <button onClick={() => setIsScannerOpen(true)}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12,
                  width:'100%', padding:'16px 24px', borderRadius:16,
                  border:`1px solid ${INK_FAINT}`, background: BG_PANEL,
                  color: INK_DIM, fontSize:15, cursor:'pointer', marginBottom:20,
                  transition:'all 0.2s' }}>
                <SvgCamera className="w-5 h-5" style={{ color: tc, opacity:0.6 }} />
                Scan a document or photo
              </button>

              {/* Extracted texts */}
              {material.importedTexts.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  {material.importedTexts.map((t, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:12,
                      padding:'12px 16px', borderRadius:12,
                      border:'1px solid rgba(96,165,250,0.15)',
                      background:'rgba(96,165,250,0.04)', marginBottom:6 }}>
                      <SvgDocument className="w-4 h-4" style={{ color:'rgba(96,165,250,0.5)', flexShrink:0 }} />
                      <span style={{ flex:1, fontSize:13, color: INK_DIM, overflow:'hidden',
                        textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</span>
                      <button onClick={() => onRemoveText(i)}
                        style={{ background:'none', border:'none', cursor:'pointer',
                          color:'rgba(248,113,113,0.4)', padding:4 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8 }}>
                <button onClick={() => goTo(0)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px',
                    borderRadius:20, border:`1px solid ${INK_FAINT}`,
                    background:'transparent', color: INK_DIM,
                    fontSize:11, fontFamily:'system-ui', fontWeight:700,
                    letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer' }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="7" x2="2" y2="7"/><polyline points="6,3 2,7 6,11"/></svg>
                  Back
                </button>
                <button onClick={() => goTo(2)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 28px',
                    borderRadius:24, border:`1px solid ${tc}45`,
                    background:`${tc}15`, color: tc,
                    fontSize:11, fontFamily:'system-ui', fontWeight:700,
                    letterSpacing:'0.25em', textTransform:'uppercase', cursor:'pointer' }}>
                  Talk to Connie
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="7" x2="12" y2="7"/><polyline points="8,3 12,7 8,11"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════
               STEP 2 — VOICE / TALK TO CONNIE
          ════════════════════════════════════════════════════════════ */}
          <div style={{ width:'100vw', height:'100%', overflowY:'auto', flexShrink:0 }}>
            <div style={{ maxWidth:780, margin:'0 auto', padding:'48px 48px 32px' }}>

              <div style={{ marginBottom:36 }}>
                <div style={{ fontSize:10, fontFamily:'system-ui', fontWeight:900,
                  letterSpacing:'0.4em', textTransform:'uppercase', color: tc, marginBottom:10 }}>
                  Step 3 of 4
                </div>
                <div style={{ fontSize:36, fontWeight:'bold', color: INK, lineHeight:1.1, marginBottom:8 }}>
                  Talk to Connie
                </div>
                <div style={{ fontSize:16, fontStyle:'italic', color: INK_DIM }}>
                  Voice captures what words alone can't. Connie will guide you.
                </div>
              </div>

              {material.transcript ? (
                <div style={{ padding:'40px', borderRadius:24, textAlign:'center',
                  border:'1px solid rgba(74,222,128,0.2)',
                  background:'rgba(74,222,128,0.04)', marginBottom:24 }}>
                  <div style={{ width:56, height:56, borderRadius:'50%', margin:'0 auto 16px',
                    background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.3)',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><polyline points="4,12 9,17 20,6"/></svg>
                  </div>
                  <div style={{ fontSize:16, color:'rgba(74,222,128,0.85)', fontWeight:'bold', marginBottom:8 }}>
                    Conversation recorded
                  </div>
                  <div style={{ fontSize:14, fontStyle:'italic', color:'rgba(74,222,128,0.45)', marginBottom:20 }}>
                    "{material.transcript.substring(0, 100)}..."
                  </div>
                  <button onClick={onTalk}
                    style={{ padding:'10px 24px', borderRadius:20,
                      border:'1px solid rgba(74,222,128,0.25)',
                      background:'transparent', color:'rgba(74,222,128,0.6)',
                      fontSize:11, fontFamily:'system-ui', fontWeight:700,
                      letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer' }}>
                    Continue the conversation
                  </button>
                </div>
              ) : (
                <button onClick={onTalk}
                  style={{ width:'100%', padding:'56px 40px', borderRadius:28,
                    border:`1px solid ${tc}30`,
                    background:`${tc}08`, cursor:'pointer',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:20,
                    transition:'all 0.3s', marginBottom:24 }}>
                  <div style={{ width:72, height:72, borderRadius:'50%',
                    background:`${tc}18`, border:`1px solid ${tc}45`,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <SvgMic className="w-8 h-8" style={{ color: tc }} />
                  </div>
                  <div>
                    <div style={{ fontSize:22, color: INK, marginBottom:6 }}>
                      Talk to Connie
                    </div>
                    <div style={{ fontSize:12, fontFamily:'system-ui', color: INK_DIM,
                      letterSpacing:'0.25em', textTransform:'uppercase' }}>
                      Voice conversation — most powerful
                    </div>
                  </div>
                </button>
              )}

              <div style={{ textAlign:'center', marginBottom:24,
                fontSize:12, fontFamily:'system-ui', color: INK_FAINT,
                letterSpacing:'0.25em', textTransform:'uppercase' }}>
                Or skip — what you wrote is enough to begin
              </div>

              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <button onClick={() => goTo(1)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px',
                    borderRadius:20, border:`1px solid ${INK_FAINT}`,
                    background:'transparent', color: INK_DIM,
                    fontSize:11, fontFamily:'system-ui', fontWeight:700,
                    letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer' }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="7" x2="2" y2="7"/><polyline points="6,3 2,7 6,11"/></svg>
                  Back
                </button>
                <button onClick={() => goTo(3)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 28px',
                    borderRadius:24, border:`1px solid ${tc}45`,
                    background:`${tc}15`, color: tc,
                    fontSize:11, fontFamily:'system-ui', fontWeight:700,
                    letterSpacing:'0.25em', textTransform:'uppercase', cursor:'pointer' }}>
                  Set the Feeling
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="7" x2="12" y2="7"/><polyline points="8,3 12,7 8,11"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════
               STEP 3 — THE FEELING (Tone + Narrative Style)
          ════════════════════════════════════════════════════════════ */}
          <div style={{ width:'100vw', height:'100%', overflowY:'auto', flexShrink:0 }}>
            <div style={{ maxWidth:820, margin:'0 auto', padding:'40px 48px 32px' }}>

              {/* ── Section 1: Emotional Tone ── */}
              <div style={{ marginBottom:32 }}>
                <div style={{ fontSize:10, fontFamily:'system-ui', fontWeight:900,
                  letterSpacing:'0.4em', textTransform:'uppercase', color: tc, marginBottom:10 }}>
                  Step 4 of 4 · Emotional Tone
                </div>
                <div style={{ fontSize:30, fontWeight:'bold', color: INK, lineHeight:1.1, marginBottom:6 }}>
                  How should this feel?
                </div>
                <div style={{ fontSize:14, fontStyle:'italic', color: INK_DIM, marginBottom:20 }}>
                  Connie shapes the writing, music, and imagery around this emotion.
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {STORY_TONES.map(tone => (
                    <button key={tone.id} onClick={() => setStoryTone(tone.id)}
                      style={{ display:'flex', alignItems:'center', gap:14,
                        padding:'16px 18px', borderRadius:16, textAlign:'left',
                        border:`1px solid ${storyTone === tone.id ? tone.color + '55' : INK_FAINT}`,
                        background: storyTone === tone.id ? `${tone.color}12` : BG_PANEL,
                        cursor:'pointer', transition:'all 0.2s' }}>
                      <span style={{ flexShrink:0 }}>
                        {(() => { const Icon = TONE_ICON_MAP[tone.id] || ToneIconAI; return <Icon size={22} color={storyTone === tone.id ? tone.color : 'rgba(255,248,235,0.3)'} />; })()}
                      </span>
                      <div>
                        <div style={{ fontSize:14, fontWeight:'bold', marginBottom:2,
                          color: storyTone === tone.id ? tone.color : INK_DIM }}>
                          {tone.label}
                        </div>
                        <div style={{ fontSize:11, fontStyle:'italic', color: INK_FAINT }}>
                          {tone.subLabel}
                        </div>
                      </div>
                      {storyTone === tone.id && (
                        <div style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%',
                          background: tone.color, boxShadow:`0 0 8px ${tone.color}`, flexShrink:0 }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Divider ── */}
              <div style={{ height:1, background: INK_FAINT, margin:'8px 0 28px' }} />

              {/* ── Section 2: Narrative Style ── */}
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:10, fontFamily:'system-ui', fontWeight:900,
                  letterSpacing:'0.4em', textTransform:'uppercase', color: tc, marginBottom:8 }}>
                  Narrative Style
                </div>
                <div style={{ fontSize:18, fontWeight:'bold', color: INK, lineHeight:1.1, marginBottom:6 }}>
                  How should it be told?
                </div>
                <div style={{ fontSize:13, fontStyle:'italic', color: INK_DIM, marginBottom:16 }}>
                  This shapes the structure and voice of the story. Non-linear works best with rich material.
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {NARRATIVE_STYLES.map(style => (
                    <button key={style.id} onClick={() => setNarrativeStyle(style.id)}
                      style={{ display:'flex', flexDirection:'column', gap:6,
                        padding:'14px 16px', borderRadius:14, textAlign:'left',
                        border:`1px solid ${narrativeStyle === style.id ? tc + '55' : INK_FAINT}`,
                        background: narrativeStyle === style.id ? `${tc}10` : BG_CARD,
                        cursor:'pointer', transition:'all 0.2s' }}>
                      <span style={{ fontSize:20 }}>{style.emoji}</span>
                      <div style={{ fontSize:13, fontWeight:'bold',
                        color: narrativeStyle === style.id ? tc : INK_DIM }}>
                        {style.label}
                      </div>
                      <div style={{ fontSize:11, fontStyle:'italic', color: INK_FAINT, lineHeight:1.4 }}>
                        {style.subLabel}
                      </div>
                      {narrativeStyle === style.id && (
                        <div style={{ width:6, height:6, borderRadius:'50%', marginTop:2,
                          background: tc, boxShadow:`0 0 6px ${tc}` }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'flex-start' }}>
                <button onClick={() => goTo(2)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px',
                    borderRadius:20, border:`1px solid ${INK_FAINT}`,
                    background:'transparent', color: INK_DIM,
                    fontSize:11, fontFamily:'system-ui', fontWeight:700,
                    letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer' }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="7" x2="2" y2="7"/><polyline points="6,3 2,7 6,11"/></svg>
                  Back
                </button>
              </div>
            </div>
          </div>

        </div>{/* /track */}
      </div>{/* /body */}

      {/* ── FOOTER — ALWAYS VISIBLE ── */}
      <div style={{ flexShrink:0, zIndex:20, padding:'20px 48px',
        borderTop:`1px solid ${INK_FAINT}`,
        background:'rgba(19,16,12,0.97)', backdropFilter:'blur(20px)' }}>
        <div style={{ maxWidth:780, margin:'0 auto' }}>

          {/* Material chips */}
          {totalMaterials > 0 && (
            <div style={{ display:'flex', gap:16, marginBottom:14, flexWrap:'wrap' }}>
              {(quickNote.trim() || material.transcript) && (
                <span style={{ fontSize:10, fontFamily:'system-ui', fontWeight:700,
                  letterSpacing:'0.3em', textTransform:'uppercase', color:'rgba(74,222,128,0.6)' }}>
                  ● {material.transcript ? 'Voice conversation' : 'Description written'}
                </span>
              )}
              {material.artifacts.length > 0 && (
                <span style={{ fontSize:10, fontFamily:'system-ui', fontWeight:700,
                  letterSpacing:'0.3em', textTransform:'uppercase', color:'rgba(96,165,250,0.6)' }}>
                  ● {material.artifacts.length} photo{material.artifacts.length !== 1 ? 's' : ''}
                </span>
              )}
              {material.importedTexts.length > 0 && (
                <span style={{ fontSize:10, fontFamily:'system-ui', fontWeight:700,
                  letterSpacing:'0.3em', textTransform:'uppercase', color:`${tc}80` }}>
                  ● {material.importedTexts.length} document{material.importedTexts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* THE GENERATE BUTTON */}
          <button onClick={handleGenerate} disabled={!canGenerate}
            style={{ width:'100%', padding:'20px 32px', borderRadius:28,
              border:'none', cursor: canGenerate ? 'pointer' : 'not-allowed',
              display:'flex', alignItems:'center', justifyContent:'center', gap:12,
              fontSize:15, fontFamily:'system-ui', fontWeight:800,
              letterSpacing:'0.3em', textTransform:'uppercase',
              transition:'all 0.3s',
              opacity: canGenerate ? 1 : 0.25,
              background: canGenerate
                ? `linear-gradient(135deg, ${tc}, ${tc}88)`
                : BG_PANEL,
              color: canGenerate ? '#13100C' : INK_FAINT,
              boxShadow: canGenerate ? `0 8px 40px ${tc}35, 0 2px 8px ${tc}20` : 'none',
              transform: canGenerate ? 'translateY(0)' : 'none' }}>
            <SvgSparkle className="w-5 h-5" />
            Create {subject}'s Story
          </button>

          {isProcessing && (
            <p style={{ fontSize: 10, color: tc, fontFamily: 'system-ui', textAlign: 'center', letterSpacing: '.1em', marginTop: 8, opacity: 0.7 }}>
              {isUploading ? '⏳ Uploading...' : pendingAnalysis > 0 ? `🔍 Analyzing ${pendingAnalysis} item${pendingAnalysis > 1 ? 's' : ''}...` : ''}
            </p>
          )}
          {!canGenerate && !isProcessing && (
            <div style={{ textAlign:'center', marginTop:10, fontSize:11,
              fontFamily:'system-ui', color: INK_FAINT,
              letterSpacing:'0.25em', textTransform:'uppercase' }}>
              Write something, add a photo, or talk to Connie to begin
            </div>
          )}
        </div>
      </div>

      {/* Bounce keyframe for Connie thinking dots */}
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)} }`}</style>

      {isScannerOpen && <CameraScanner onScanComplete={handleScanComplete} onClose={() => setIsScannerOpen(false)} />}
    </div>
  );
};

export default GatheringScreen;
