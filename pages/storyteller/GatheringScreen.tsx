import React, { useState, useCallback, useRef, useEffect } from 'react';
import CameraScanner, { ScanResult } from '../../components/CameraScanner';
import DocumentScannerModal from '../../components/DocumentScannerModal';
import { NeuralAsset } from '../../types';
import { storageService } from '../../services/storageService';
import { fileToBase64, extractTextFromPdf } from '../../utils/fileUtils';
import { enhancePhoto } from '../../services/photoEnhancement';
import IntakeAgent from '../../components/IntakeAgent';

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';
const CASCADE_URL = `${SUPABASE_URL}/functions/v1/story-cascade`;

import { CONNIE_PORTRAIT, BRAND, isWissums } from '../../utils/brandUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhotoFactExtraction {
  assetId: string;
  fileName: string;
  era: string;
  verifiedFacts: string[];
  visibleText: Record<string, string | null>;
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
  persona?: 'curator' | 'keeper' | 'pet';
  onTalk: () => void;
  onPhotos: (assets: NeuralAsset[]) => void;
  onText: (name: string, content: string) => void;
  onRemoveArtifact: (id: string) => void;
  onRemoveText: (index: number) => void;
  onCreate: (photoAnalysis?: any, narrativeStyle?: string, musicQuery?: string, imagePalette?: string, petMode?: boolean, verifiedPhotoFacts?: string[], narratorVoice?: string) => void;
  onExit: () => void;
  petMode?: boolean;
  onSetSubject?: (name: string) => void;
}

// ─── Connie message bubble ────────────────────────────────────────────────────

const ConnieBubble: React.FC<{ text: string; isTyping?: boolean }> = ({ text, isTyping }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
    <img
      src={CONNIE_PORTRAIT}
      alt={BRAND.agentName}
      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
        border: '1.5px solid rgba(196,151,59,0.4)' }}
    />
    <div style={{
      background: 'rgba(196,151,59,0.08)', border: '1px solid rgba(196,151,59,0.18)',
      borderRadius: '4px 20px 20px 20px', padding: '14px 18px',
      fontFamily: 'Georgia, serif', fontSize: 16, lineHeight: 1.65,
      color: 'rgba(253,246,236,0.88)', maxWidth: 480,
    }}>
      {isTyping ? (
        <span style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'rgba(196,151,59,0.5)',
              animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
              display: 'inline-block',
            }} />
          ))}
        </span>
      ) : text}
    </div>
  </div>
);

// ─── Action card — the three big buttons ─────────────────────────────────────

interface ActionCardProps {
  icon: string;
  label: string;
  sublabel: string;
  onClick: () => void;
  disabled?: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, label, sublabel, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      flex: 1, minWidth: 0, padding: '20px 16px', borderRadius: 20,
      background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(196,151,59,0.07)',
      border: `1.5px solid ${disabled ? 'rgba(255,255,255,0.06)' : 'rgba(196,151,59,0.25)'}`,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 8, transition: 'all 0.18s', opacity: disabled ? 0.45 : 1,
    }}
    onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(196,151,59,0.14)'; }}
    onMouseLeave={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(196,151,59,0.07)'; }}
  >
    <span style={{ fontSize: 32 }}>{icon}</span>
    <span style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 700,
      color: 'rgba(253,246,236,0.9)', textAlign: 'center' }}>{label}</span>
    <span style={{ fontFamily: 'system-ui', fontSize: 11, color: 'rgba(253,246,236,0.35)',
      textAlign: 'center', lineHeight: 1.4 }}>{sublabel}</span>
  </button>
);

// ─── Asset thumbnail ──────────────────────────────────────────────────────────

const AssetThumb: React.FC<{ asset: NeuralAsset; onRemove: (id: string) => void; restoring?: boolean }> = ({ asset, onRemove, restoring }) => (
  <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden',
    width: 80, height: 80, flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}>
    {asset.public_url ? (
      <img src={asset.public_url} alt={asset.metadata?.title || ''}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 28 }}>📄</div>
    )}
    {restoring && (
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(19,16,12,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 16, animation: 'spin 1s linear infinite', display: 'inline-block' }}>✨</span>
      </div>
    )}
    <button
      onClick={() => onRemove(asset.id)}
      style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20,
        borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none',
        color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >×</button>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { value: 'peaceful calm contemplative slow', label: 'Peaceful', icon: '🌿' },
  { value: 'cinematic epic orchestral inspiring', label: 'Cinematic', icon: '🎬' },
  { value: 'hopeful inspiring uplifting warm', label: 'Uplifting', icon: '☀️' },
  { value: 'reflective nostalgic emotional memory', label: 'Reflective', icon: '🪞' },
  { value: 'tender soft gentle intimate quiet', label: 'Tender', icon: '🕊️' },
] as const;

const NARRATIVE_STYLE_OPTIONS = [
  { value: 'cinematic', label: 'Cinematic', desc: 'dramatic, in medias res', icon: '🎬' },
  { value: 'non-linear memory', label: 'Non-Linear Memory', desc: 'time jumps, motifs', icon: '🌀' },
  { value: 'poetic & soulful', label: 'Poetic & Soulful', desc: 'lyrical, metaphorical', icon: '🪶' },
  { value: 'adventurous saga', label: 'Adventurous Saga', desc: 'hero journey, active', icon: '⚔️' },
  { value: 'intimate letter', label: 'Intimate Letter', desc: 'direct address, private', icon: '✉️' },
  { value: 'oral tradition', label: 'Oral Tradition', desc: 'spoken, fireside feel', icon: '🗣️' },
  { value: 'eloquent biographical', label: 'Eloquent Biographical', desc: 'definitive, warm', icon: '📖' },
  { value: 'journalistic', label: 'Journalistic', desc: 'precise, quote-driven', icon: '📰' },
] as const;

const NARRATOR_VOICE_OPTIONS = [
  { value: 'Kore',   label: 'Kore',   desc: 'warm, intimate feminine',  icon: '🌙' },
  { value: 'Aoede',  label: 'Aoede',  desc: 'melodic, expressive',      icon: '🎶' },
  { value: 'Puck',   label: 'Puck',   desc: 'bright, storytelling',     icon: '✨' },
  { value: 'Charon', label: 'Charon', desc: 'deep, authoritative',      icon: '🌊' },
  { value: 'Fenrir', label: 'Fenrir', desc: 'clear, measured masculine',icon: '🔥' },
] as const;

const VISUAL_STYLE_OPTIONS = [
  { value: 'cinematic', label: 'Cinematic', desc: 'painterly, dramatic', icon: '🎥' },
  { value: 'vintage', label: 'Vintage', desc: 'warm, period-accurate', icon: '📷' },
  { value: 'watercolor', label: 'Watercolor', desc: 'soft, artistic', icon: '🎨' },
  { value: 'documentary', label: 'Documentary', desc: 'realistic, grounded', icon: '🎞️' },
  { value: 'illustrated', label: 'Illustrated', desc: 'storybook style', icon: '✏️' },
] as const;

const GatheringScreen: React.FC<GatheringScreenProps> = ({
  subject, material, persona = 'curator', onTalk, onPhotos, onText, onRemoveArtifact, onRemoveText, onCreate, onExit, petMode = false, onSetSubject,
}) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState(0);
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());
  const [extractedPhotoFacts, setExtractedPhotoFacts] = useState<PhotoFactExtraction[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [connieMessage, setConnieMessage] = useState('');
  const [isConnieTyping, setIsConnieTyping] = useState(true);
  const [selectedMood, setSelectedMood] = useState(MOOD_OPTIONS[3].value); // default: Reflective
  const [selectedNarrativeStyle, setSelectedNarrativeStyle] = useState('eloquent biographical');
  const [selectedVisualStyle, setSelectedVisualStyle] = useState('cinematic');
  const [selectedNarratorVoice, setSelectedNarratorVoice] = useState('Aoede');
  const [obituaryUrl, setObituaryUrl] = useState('');
  const [obituaryLoading, setObituaryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const gold = '#C4973B';
  const dark = '#13100C';

  const artifacts = material.artifacts || [];
  const importedTexts = material.importedTexts || [];
  const totalMaterials = artifacts.length + importedTexts.length +
    (material.transcript ? 1 : 0);
  const isProcessing = isUploading || pendingAnalysis > 0;
  // curator = fire immediately with 1+ item, keeper = encourage more but don't block
  const minItems = persona === 'curator' ? 1 : 1;
  const canCreate = totalMaterials >= minItems && !isProcessing;
  const createLabel = persona === 'curator' ? 'Create the Story' : persona === 'keeper' ? 'Weave the Story' : 'Create the Memorial';

  // ── Connie opening message — varies by persona ────────────────────────────
  useEffect(() => {
    const messages = {
      curator: [
        `Upload a photo or write a few sentences about ${subject} — ${BRAND.agentName} will craft a complete cinematic story in under 2 minutes.`,
        `One photo is all ${BRAND.agentName} needs to begin ${subject}'s story. Add it here and she'll do the rest.`,
      ],
      keeper: [
        `I'm here to help preserve ${subject}'s story. Add a photo, scan a document, or just tell me about them — anything at all is a wonderful place to start.`,
        `Every detail matters. Tell me about ${subject}, or add a photo — I'll help weave it into something the family will treasure for generations.`,
      ],
      pet: [
        `Tell me about ${subject} — what were they like? Any memories, photos, or stories you'd like to share.`,
        `${subject} deserves to be remembered forever. Share a photo or a memory and I'll weave it into something beautiful.`,
      ],
    };
    const pool = messages[petMode ? 'pet' : persona] || messages.keeper;
    setIsConnieTyping(true);
    const t = setTimeout(() => {
      setConnieMessage(pool[Math.floor(Math.random() * pool.length)]);
      setIsConnieTyping(false);
    }, 800);
    return () => clearTimeout(t);
  }, [subject, petMode, persona]);

  // ── When materials are added, Connie reacts ───────────────────────────────
  const prevCount = useRef(0);
  useEffect(() => {
    if (totalMaterials > prevCount.current && totalMaterials > 0) {
      const reactions = [
        `That's wonderful — thank you for sharing. Add more if you have them, or I am ready to begin whenever you are.`,
        `Beautiful. Every piece helps tell a richer story. Feel free to add more, or tap "Create the Story" when you're ready.`,
        `I can already feel this story taking shape. More photos are always welcome, or we can start whenever you'd like.`,
      ];
      setIsConnieTyping(true);
      const t = setTimeout(() => {
        setConnieMessage(reactions[Math.floor(Math.random() * reactions.length)]);
        setIsConnieTyping(false);
        prevCount.current = totalMaterials;
      }, 600);
      return () => clearTimeout(t);
    }
  }, [totalMaterials]);

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Photo facts extraction ────────────────────────────────────────────────
  // Convert any image to JPEG base64 for Gemini compatibility (WebP/HEIC/etc can cause 400s)
  const imageToJpegBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')?.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.92).split(',')[1]);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
      img.src = url;
    });

  const extractPhotoFacts = async (file: File, assetId: string): Promise<PhotoFactExtraction | null> => {
    try {
      // Always send as JPEG to avoid WebP/HEIC 400 errors from Gemini
      const base64 = await imageToJpegBase64(file);
      const response = await fetch(CASCADE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: 'analyze_photo', image_base64: base64, mime_type: 'image/jpeg' }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      const analysis = data.analysis || {};
      return {
        assetId, fileName: file.name, era: analysis.estimated_era || '',
        verifiedFacts: analysis.verified_facts || [], visibleText: analysis.visible_text || {},
      };
    } catch { return null; }
  };

  // ── File upload handler ───────────────────────────────────────────────────
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
          // async restore — fully isolated, never crashes the upload flow
          (async () => {
            try {
              const b64 = await fileToBase64(file);
              // Guard: enhancePhoto requires data:image/...;base64,... format
              if (!b64 || typeof b64 !== 'string' || !b64.match(/^data:image\/\w+;base64,/)) {
                console.warn('[GatheringScreen] Photo restore skipped: invalid base64 format');
                return;
              }
              const enhanced = await enhancePhoto(b64, 'restore', () => {});
              if (enhanced?.imageData) {
                onPhotos([{ ...asset, id: `restored-${asset.id}`, public_url: enhanced.imageData, metadata: { ...asset.metadata, restored: true } }]);
              }
            } catch (e) {
              console.warn('[GatheringScreen] Photo restore skipped:', e);
            } finally {
              setRestoringIds(prev => { const n = new Set(prev); n.delete(asset.id); return n; });
            }
          })();
          // async analysis
          setPendingAnalysis(n => n + 1);
          extractPhotoFacts(file, asset.id).then(analysis => {
            if (analysis) {
              setExtractedPhotoFacts(prev => [...prev, analysis]);
              onPhotos([{ ...asset, metadata: { ...asset.metadata, era: analysis.era, verifiedFacts: analysis.verifiedFacts } }]);
              if (analysis.era) showToast(`${analysis.era} detected`, 'info');
            }
          }).finally(() => setPendingAnalysis(n => Math.max(0, n - 1)));

        } else if (
          file.type === 'application/pdf' ||
          file.type === 'text/plain' ||
          file.type === 'text/csv' ||
          file.type === 'application/rtf' ||
          file.type === 'text/rtf' ||
          file.type === 'application/msword' ||
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.name.match(/\.(txt|rtf|doc|docx|csv|odt|pages)$/i)
        ) {
          let content = '';
          try {
            if (file.type === 'application/pdf') {
              content = await extractTextFromPdf(file);
            } else {
              content = await file.text();
            }
          } catch {
            content = '';
          }
          // Never pass empty or error strings to cascade — they poison the story
          if (content.trim()) {
            onText(file.name, content);
            showToast(`Document added — ${file.name}`, 'success');
          } else if (file.type === 'application/pdf') {
            // Client extraction failed — upload as artifact for server-side Gemini analysis
            try {
              const asset = await storageService.uploadFile(file, { title: file.name, tags: ['document', 'pdf'] });
              onPhotos([asset]);
              showToast(`Document uploaded — AI will analyze it`, 'info');
            } catch {
              showToast(`Could not process ${file.name}`, 'error');
            }
          }
        }
      } catch { showToast(`Failed: ${file.name}`, 'error'); }
    }
    if (newAssets.length > 0) { onPhotos(newAssets); showToast(`${newAssets.length} photo${newAssets.length > 1 ? 's' : ''} added`, 'success'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(false);
  };

  // ── Scan complete handler ─────────────────────────────────────────────────
  const handleScanComplete = async (scan: ScanResult) => {
    // Always upload the image first
    const mimeType = 'image/png';
    const b = atob(scan.base64), ab = new ArrayBuffer(b.length), ia = new Uint8Array(ab);
    for (let i = 0; i < b.length; i++) ia[i] = b.charCodeAt(i);
    const file = new File([new Blob([ab], { type: mimeType })], 'scan-' + Date.now() + '.png', { type: mimeType });
    setIsUploading(true);
    try {
      const a = await storageService.uploadFile(file, { title: 'Scanned ' + (scan.documentType || 'Photo'), tags: ['scan'] });
      onPhotos([a]);
    } catch { showToast('Scan upload failed', 'error'); }
    finally { setIsUploading(false); }

    // Ask Connie to analyze what was scanned
    setIsConnieTyping(true);
    setConnieMessage('');
    try {
      const analysisResponse = await fetch(CASCADE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
        body: JSON.stringify({
          action: 'analyze_photo',
          photo_base64: scan.base64,
          photo_mime_type: 'image/png',
          context: subject,
        }),
      });
      if (analysisResponse.ok) {
        const d = await analysisResponse.json();
        const parts = ['[Scanned ' + (scan.documentType || 'Document') + (d.era ? ' — ' + d.era : '') + ']'];
        if (d.description) parts.push(d.description);
        if (d.transcribed_text || scan.transcribedText) parts.push('\nTRANSCRIPT:\n' + (d.transcribed_text || scan.transcribedText));
        if (d.verified_facts && d.verified_facts.length) parts.push('\nKEY FACTS: ' + d.verified_facts.join(' · '));
        onText('Scan: ' + (scan.documentType || 'Document'), parts.join('\n'));
        setConnieMessage(d.description
          ? 'I can see this — ' + d.description.substring(0, 80) + (d.description.length > 80 ? '...' : '') + '. This will add something meaningful to the story.'
          : 'Got it — I have added what I found. Add more or I am ready to begin whenever you are.');
      } else {
        const parts = ['[Scanned ' + (scan.documentType || 'Document') + ' — ' + (scan.era || 'Unknown Era') + ']'];
        if (scan.description) parts.push(scan.description);
        if (scan.transcribedText) parts.push('\nTRANSCRIPT:\n' + scan.transcribedText);
        if (scan.keyFacts && scan.keyFacts.length) parts.push('\nKEY FACTS: ' + scan.keyFacts.join(' · '));
        onText('Scan: ' + (scan.documentType || 'Document'), parts.join('\n'));
        setConnieMessage('Scan added. Ready to create whenever you are.');
      }
    } catch {
      if (scan.transcribedText) onText('Scan: ' + (scan.documentType || 'Document'), scan.transcribedText);
      setConnieMessage('Scan added. Ready to create whenever you are.');
    } finally {
      setIsConnieTyping(false);
      showToast('Scan added ✓', 'success');
    }
  };
  // ── Fetch obituary URL ──────────────────────────────────────────────────
  const handleFetchObituary = async () => {
    const url = obituaryUrl.trim();
    if (!url) return;
    setObituaryLoading(true);
    setIsConnieTyping(true);
    setConnieMessage('');
    try {
      const res = await fetch(CASCADE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ action: 'fetch_url', url }),
      });
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const data = await res.json();
      if (!data.text || data.text.length < 50) throw new Error('Could not extract meaningful text from that page');
      onText('Obituary', data.text);
      if (data.name && onSetSubject) onSetSubject(data.name);
      setConnieMessage(data.name
        ? `I found ${data.name}'s obituary. I have everything I need to begin their story.`
        : 'Obituary added. Ready to create the story whenever you are.');
      setObituaryUrl('');
      showToast('Obituary imported', 'success');
    } catch (err: any) {
      setConnieMessage('I couldn\'t read that page. Check the URL and try again.');
      showToast(err.message || 'Failed to fetch URL', 'error');
    } finally {
      setObituaryLoading(false);
      setIsConnieTyping(false);
    }
  };

    // ── Create story ──────────────────────────────────────────────────────────
  const handleGenerate = () => {
    if (!canCreate) return;
    const allVerifiedFacts = extractedPhotoFacts.flatMap(f => f.verifiedFacts || []);
    if (allVerifiedFacts.length > 0) {
      onText('Verified Photo Facts', `[VERIFIED FACTS FROM PHOTOS — USE VERBATIM]\n${allVerifiedFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`);
    }
    onCreate(undefined, selectedNarrativeStyle, selectedMood, selectedVisualStyle, petMode, allVerifiedFacts, selectedNarratorVoice);
  };

  // ── Shared chip row renderer ─────────────────────────────────────────────
  const chipRow = (
    opts: readonly { value: string; label: string; icon: string; desc?: string }[],
    selected: string,
    onSelect: (v: string) => void
  ) => (
    <div style={{
      display: 'flex', gap: 6, overflowX: 'auto',
      WebkitOverflowScrolling: 'touch' as any,
      scrollbarWidth: 'none' as any, msOverflowStyle: 'none' as any,
      paddingBottom: 2,
    }}>
      {opts.map(opt => {
        const sel = selected === opt.value;
        return (
          <button key={opt.value} onClick={() => onSelect(opt.value)} title={opt.desc || opt.label}
            style={{
              flexShrink: 0, padding: '10px 16px', borderRadius: 22,
              minHeight: 40,
              fontSize: 13, fontFamily: 'system-ui', fontWeight: 600,
              whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s',
              border: sel ? '1.5px solid rgba(196,151,59,0.65)' : '1px solid rgba(255,255,255,0.09)',
              background: sel ? 'rgba(196,151,59,0.16)' : 'rgba(255,255,255,0.03)',
              color: sel ? '#C4973B' : 'rgba(253,246,236,0.4)',
              boxShadow: sel ? '0 0 0 1px rgba(196,151,59,0.1)' : 'none',
            }}>
            {opt.icon} {opt.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{
      height: '100%', overflowY: 'auto', background: '#0F0D0A',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>

      {/* ── Header ── */}
      <div style={{
        width: '100%', maxWidth: 560, padding: '24px 24px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <button onClick={onExit} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: 'system-ui',
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0',
        }}>
          ← Back
        </button>
        <div style={{ fontSize: 11, fontFamily: 'system-ui', fontWeight: 700,
          letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(196,151,59,0.5)' }}>
          {subject ? `${subject}'s story` : 'New story'}
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* ── Main content ── */}
      <div style={{ width: '100%', maxWidth: 560, padding: '28px 24px 140px', flex: 1 }}>

        {/* Connie message */}
        <ConnieBubble text={connieMessage} isTyping={isConnieTyping} />

        {/* ── CONNIE PRIMARY CTA ── */}
        <button
          onClick={onTalk}
          style={{
            width: '100%', padding: '16px 20px', marginBottom: 12,
            background: 'linear-gradient(135deg, rgba(196,151,59,0.15), rgba(196,151,59,0.05))',
            border: '1.5px solid rgba(196,151,59,0.4)', borderRadius: 16,
            display: 'flex', alignItems: 'center', gap: 14,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <img src={CONNIE_PORTRAIT} alt={BRAND.agentName}
            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
              border: '2px solid rgba(196,151,59,0.5)', flexShrink: 0 }} />
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(253,246,236,0.95)',
              fontFamily: 'Georgia, serif', marginBottom: 2 }}>Talk with {BRAND.agentName}</div>
            <div style={{ fontSize: 12, color: 'rgba(196,151,59,0.7)', fontFamily: 'system-ui' }}>
              Just speak — she'll ask the right questions</div>
          </div>
          <div style={{ fontSize: 20, opacity: 0.5 }}>›</div>
        </button>

        {/* ── Upload + Camera ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <ActionCard icon="🖼️" label="Upload" sublabel="Photos, PDFs, documents"
            onClick={() => fileInputRef.current?.click()} disabled={isUploading} />
          <ActionCard icon="📷" label="Camera / Scan" sublabel="Take a photo or scan"
            onClick={() => setIsScannerOpen(true)} disabled={isUploading} />
        </div>

        {/* ── Obituary URL ── */}
        <div style={{
          marginBottom: 20, padding: '12px 14px', borderRadius: 14,
          background: 'rgba(196,151,59,0.04)', border: '1px solid rgba(196,151,59,0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 13 }}>🔗</span>
            <span style={{ fontSize: 10, fontFamily: 'system-ui', fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(196,151,59,0.6)' }}>
              Obituary URL
            </span>
            <span style={{ fontSize: 11, color: 'rgba(253,246,236,0.2)', fontFamily: 'system-ui', marginLeft: 4 }}>
              — auto-extracts name &amp; details
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="url"
              placeholder="Paste obituary link..."
              value={obituaryUrl}
              onChange={e => setObituaryUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetchObituary()}
              disabled={obituaryLoading}
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(253,246,236,0.9)', fontSize: 13, fontFamily: 'system-ui', outline: 'none',
              }}
            />
            <button
              onClick={handleFetchObituary}
              disabled={!obituaryUrl.trim() || obituaryLoading}
              style={{
                padding: '9px 16px', borderRadius: 10, border: 'none',
                background: obituaryUrl.trim() && !obituaryLoading ? `linear-gradient(135deg, ${gold}, #B07D2A)` : 'rgba(255,255,255,0.06)',
                color: obituaryUrl.trim() && !obituaryLoading ? dark : 'rgba(255,255,255,0.2)',
                fontSize: 12, fontFamily: 'system-ui', fontWeight: 700,
                cursor: obituaryUrl.trim() && !obituaryLoading ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
              }}
            >
              {obituaryLoading ? 'Reading...' : 'Import'}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,text/plain,text/csv,.doc,.docx,.txt,.rtf,.odt,.pages,.heic,.heif,.tiff,.bmp,.webp"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        {/* ── Added items ── */}
        {(artifacts.length > 0 || importedTexts.length > 0 || material.transcript) && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontFamily: 'system-ui', fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>
              Added so far
            </div>
            {artifacts.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {artifacts.map(a => (
                  <AssetThumb key={a.id} asset={a} onRemove={onRemoveArtifact} restoring={restoringIds.has(a.id)} />
                ))}
              </div>
            )}
            {importedTexts.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 12px', borderRadius: 9, marginBottom: 5,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 13 }}>📄</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                </div>
                <button onClick={() => onRemoveText(i)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.25)', fontSize: 16, flexShrink: 0, padding: '0 4px',
                }}>×</button>
              </div>
            ))}
            {material.transcript && (
              <div style={{
                padding: '9px 12px', borderRadius: 9,
                background: 'rgba(196,151,59,0.06)', border: '1px solid rgba(196,151,59,0.15)',
                fontSize: 13, color: 'rgba(196,151,59,0.7)', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>🎙️</span> Voice recording added
              </div>
            )}
          </div>
        )}

        {isProcessing && (
          <div style={{ textAlign: 'center', padding: '10px 0',
            fontSize: 13, color: 'rgba(196,151,59,0.6)', fontStyle: 'italic', fontFamily: 'Georgia,serif' }}>
            {isUploading ? 'Uploading…' : 'Analyzing photos…'}
          </div>
        )}

        {/* ── Story Settings — compact horizontal chip rows ── */}
        <div style={{
          marginTop: 4, marginBottom: 24, padding: '18px 16px',
          background: 'rgba(196,151,59,0.04)', border: '1px solid rgba(196,151,59,0.11)', borderRadius: 20,
        }}>
          <div style={{ fontSize: 10, fontFamily: 'system-ui', fontWeight: 800,
            letterSpacing: '0.35em', textTransform: 'uppercase',
            color: 'rgba(196,151,59,0.55)', marginBottom: 16 }}>
            Story Settings
          </div>

          {/* Writing Style */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontFamily: 'system-ui', fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: 'rgba(253,246,236,0.3)', marginBottom: 7 }}>
              📖 Writing Style
            </div>
            {chipRow(NARRATIVE_STYLE_OPTIONS, selectedNarrativeStyle, setSelectedNarrativeStyle)}
          </div>

          {/* Visual Style */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontFamily: 'system-ui', fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: 'rgba(253,246,236,0.3)', marginBottom: 7 }}>
              🎨 Visual Style
            </div>
            {chipRow(VISUAL_STYLE_OPTIONS, selectedVisualStyle, setSelectedVisualStyle)}
          </div>

          {/* Music */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontFamily: 'system-ui', fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: 'rgba(253,246,236,0.3)', marginBottom: 7 }}>
              🎵 Music
            </div>
            {chipRow(MOOD_OPTIONS, selectedMood, setSelectedMood)}
          </div>

          {/* Narrator Voice */}
          <div>
            <div style={{ fontSize: 10, fontFamily: 'system-ui', fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: 'rgba(253,246,236,0.3)', marginBottom: 7 }}>
              🎙️ Narrator Voice
            </div>
            {chipRow(NARRATOR_VOICE_OPTIONS, selectedNarratorVoice, setSelectedNarratorVoice)}
          </div>
        </div>

        {/* IntakeAgent — keeper only */}
        {totalMaterials > 0 && persona === 'keeper' && (
          <IntakeAgent
            subject={subject}
            transcript={material?.transcript || ''}
            photoCount={artifacts.length}
            photoFacts={extractedPhotoFacts?.flatMap(f => f?.verifiedFacts || []) || []}
            importedTexts={importedTexts}
            petMode={petMode}
            quickNote={''}
            onTalkToConnie={onTalk}
          />
        )}
      </div>

      {/* ── Sticky create button ── */}
      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 50,
        width: '100%',
        background: 'linear-gradient(to top, #0F0D0A 65%, transparent)',
        padding: '20px 24px 32px',
        display: 'flex', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <button
            onClick={handleGenerate}
            disabled={!canCreate}
            style={{
              width: '100%', padding: '20px 24px', borderRadius: 24,
              border: 'none', cursor: canCreate ? 'pointer' : 'not-allowed',
              background: canCreate ? `linear-gradient(135deg, ${gold}, #B07D2A)` : 'rgba(255,255,255,0.06)',
              color: canCreate ? dark : 'rgba(255,255,255,0.2)',
              fontSize: 18, fontFamily: 'Georgia, serif', fontWeight: 700,
              letterSpacing: '0.04em', transition: 'all 0.25s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: canCreate ? '0 8px 32px rgba(196,151,59,0.3)' : 'none',
            }}
          >
            {isProcessing ? (
              <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>✨</span> Processing…</>
            ) : canCreate ? (
              <><span>✨</span> {createLabel}</>
            ) : (
              <>Add a photo or memory to begin</>
            )}
          </button>
          {canCreate && (
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11,
              color: 'rgba(255,255,255,0.22)', fontFamily: 'system-ui' }}>
              {totalMaterials} item{totalMaterials !== 1 ? 's' : ''} ready
              {persona === 'keeper' && totalMaterials < 3 ? ' · Add more for a richer story' : ` · ${BRAND.agentName} will weave it all together`}
            </div>
          )}
        </div>
      </div>

      {/* ── Scanner modal ── */}
      <DocumentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={(text) => { onText('Scan', text); setIsScannerOpen(false); }}
        onImageCaptured={async (base64Png) => {
          setIsScannerOpen(false);
          setIsUploading(true);
          try {
            const b = atob(base64Png), ab = new ArrayBuffer(b.length), ia = new Uint8Array(ab);
            for (let i = 0; i < b.length; i++) ia[i] = b.charCodeAt(i);
            const file = new File([new Blob([ab], { type: 'image/png' })], `capture-${Date.now()}.png`, { type: 'image/png' });
            const asset = await storageService.uploadFile(file, { title: 'Camera capture', tags: ['gathering', 'camera'] });
            onPhotos([asset]);
            showToast('Photo added ✓', 'success');
          } catch { showToast('Upload failed', 'error'); }
          finally { setIsUploading(false); }
        }}
      />

      {/* ── Toasts ── */}
      <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', gap: 8, zIndex: 200, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '10px 20px', borderRadius: 24, fontSize: 13, fontFamily: 'system-ui',
            background: t.type === 'error' ? 'rgba(248,113,113,0.15)' : t.type === 'info' ? 'rgba(96,165,250,0.12)' : 'rgba(74,222,128,0.12)',
            border: `1px solid ${t.type === 'error' ? 'rgba(248,113,113,0.3)' : t.type === 'info' ? 'rgba(96,165,250,0.25)' : 'rgba(74,222,128,0.25)'}`,
            color: t.type === 'error' ? '#f87171' : t.type === 'info' ? '#60a5fa' : '#4ade80',
            whiteSpace: 'nowrap', backdropFilter: 'blur(8px)',
          }}>
            {t.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes typingDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default GatheringScreen;
