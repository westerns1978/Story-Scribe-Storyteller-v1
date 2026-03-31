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

const CONNIE_PORTRAIT = 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/connie-ai.png';

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
  onCreate: (photoAnalysis?: any, narrativeStyle?: string, musicQuery?: string, imagePalette?: string, petMode?: boolean, verifiedPhotoFacts?: string[]) => void;
  onExit: () => void;
  petMode?: boolean;
}

// ─── Connie message bubble ────────────────────────────────────────────────────

const ConnieBubble: React.FC<{ text: string; isTyping?: boolean }> = ({ text, isTyping }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
    <img
      src={CONNIE_PORTRAIT}
      alt="Connie"
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

const GatheringScreen: React.FC<GatheringScreenProps> = ({
  subject, material, persona = 'curator', onTalk, onPhotos, onText, onRemoveArtifact, onRemoveText, onCreate, onExit, petMode = false,
}) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState(0);
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());
  const [extractedPhotoFacts, setExtractedPhotoFacts] = useState<PhotoFactExtraction[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [connieMessage, setConnieMessage] = useState('');
  const [isConnieTyping, setIsConnieTyping] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const gold = '#C4973B';
  const dark = '#13100C';

  const totalMaterials = material.artifacts.length + material.importedTexts.length +
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
        `Upload a photo or write a few sentences about ${subject} — Connie will craft a complete cinematic story in under 2 minutes.`,
        `One photo is all Connie needs to begin ${subject}'s story. Add it here and she'll do the rest.`,
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
        `That's wonderful — thank you for sharing. Add more if you have them, or I'm ready to begin whenever you are.`,
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
  const extractPhotoFacts = async (file: File, assetId: string): Promise<PhotoFactExtraction | null> => {
    try {
      const base64 = await fileToBase64(file);
      const response = await fetch(CASCADE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: 'analyze_photo', image_base64: base64.split(',')[1], mime_type: file.type }),
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
          // async restore
          (async () => {
            try {
              const b64 = await fileToBase64(file);
              const enhanced = await enhancePhoto(b64, 'restore', () => {});
              onPhotos([{ ...asset, id: `restored-${asset.id}`, public_url: enhanced.imageData, metadata: { ...asset.metadata, restored: true } }]);
            } catch { /* restore optional */ }
            finally { setRestoringIds(prev => { const n = new Set(prev); n.delete(asset.id); return n; }); }
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

        } else if (file.type === 'application/pdf' || file.type === 'text/plain') {
          const content = file.type === 'application/pdf' ? await extractTextFromPdf(file) : await file.text();
          onText(file.name, content);
          showToast(`Document added — ${file.name}`, 'success');
        }
      } catch { showToast(`Failed: ${file.name}`, 'error'); }
    }
    if (newAssets.length > 0) { onPhotos(newAssets); showToast(`${newAssets.length} photo${newAssets.length > 1 ? 's' : ''} added`, 'success'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(false);
  };

  // ── Scan complete handler ─────────────────────────────────────────────────
  const handleScanComplete = async (scan: ScanResult) => {
    if (scan.type === 'photo' || !scan.transcribedText) {
      const mimeType = 'image/png'; // scanService now always returns PNG
      const b = atob(scan.base64), ab = new ArrayBuffer(b.length), ia = new Uint8Array(ab);
      for (let i = 0; i < b.length; i++) ia[i] = b.charCodeAt(i);
      const file = new File([new Blob([ab], { type: mimeType })], `scan-${Date.now()}.png`, { type: mimeType });
      setIsUploading(true);
      try {
        const a = await storageService.uploadFile(file, { title: `Scanned ${scan.documentType || 'Photo'}`, tags: ['scan'] });
        onPhotos([a]);
        showToast('Scan added ✓', 'success');
      } catch { showToast('Scan upload failed', 'error'); }
      finally { setIsUploading(false); }
    } else {
      const parts = [`[Scanned ${scan.documentType || 'Document'} — ${scan.era || 'Unknown Era'}]`];
      if (scan.description) parts.push(scan.description);
      if (scan.transcribedText) parts.push(`\nTRANSCRIPT:\n${scan.transcribedText}`);
      if (scan.keyFacts?.length) parts.push(`\nKEY FACTS: ${scan.keyFacts.join(' · ')}`);
      onText(`Scan: ${scan.documentType || 'Document'}`, parts.join('\n'));
      showToast('Document transcribed ✓', 'success');
    }
  };

  // ── Create story ──────────────────────────────────────────────────────────
  const handleGenerate = () => {
    if (!canCreate) return;
    const allVerifiedFacts = extractedPhotoFacts.flatMap(f => f.verifiedFacts);
    if (allVerifiedFacts.length > 0) {
      onText('Verified Photo Facts', `[VERIFIED FACTS FROM PHOTOS — USE VERBATIM]\n${allVerifiedFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`);
    }
    // AI decides tone & style — no manual picker
    onCreate(undefined, '', 'reflective nostalgic emotional', 'naturalistic, authentic period photography', petMode, allVerifiedFacts);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0F0D0A',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>

      {/* ── Header ── */}
      <div style={{
        width: '100%', maxWidth: 560, padding: '24px 24px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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
        <div style={{ width: 40 }} /> {/* spacer */}
      </div>

      {/* ── Main content ── */}
      <div style={{ width: '100%', maxWidth: 560, padding: '28px 24px 120px', flex: 1 }}>

        {/* Connie message */}
        <ConnieBubble text={connieMessage} isTyping={isConnieTyping} />

        {/* ── THREE BIG ACTION BUTTONS ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          <ActionCard
            icon="📷"
            label="Camera"
            sublabel="Snap a photo or scan a document"
            onClick={() => setIsScannerOpen(true)}
            disabled={isUploading}
          />
          <ActionCard
            icon="🖼️"
            label="Upload"
            sublabel="Photos, PDFs, documents"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          />
          <ActionCard
            icon="🎙️"
            label="Talk"
            sublabel="Tell Connie the story"
            onClick={onTalk}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,text/plain"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        {/* ── Added items ── */}
        {(material.artifacts.length > 0 || material.importedTexts.length > 0 || material.transcript) && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontFamily: 'system-ui', fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
              Added so far
            </div>

            {/* Photo thumbnails */}
            {material.artifacts.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                {material.artifacts.map(a => (
                  <AssetThumb key={a.id} asset={a} onRemove={onRemoveArtifact} restoring={restoringIds.has(a.id)} />
                ))}
              </div>
            )}

            {/* Text items */}
            {material.importedTexts.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 10, marginBottom: 6,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span>📄</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                </div>
                <button onClick={() => onRemoveText(i)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.25)', fontSize: 16, flexShrink: 0, padding: '0 4px',
                }}>×</button>
              </div>
            ))}

            {/* Transcript badge */}
            {material.transcript && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(196,151,59,0.06)', border: '1px solid rgba(196,151,59,0.15)',
                fontSize: 13, color: 'rgba(196,151,59,0.7)', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>🎙️</span> Voice recording added
              </div>
            )}
          </div>
        )}

        {/* Processing status */}
        {isProcessing && (
          <div style={{ textAlign: 'center', padding: '12px 0',
            fontSize: 13, color: 'rgba(196,151,59,0.6)', fontStyle: 'italic', fontFamily: 'Georgia,serif' }}>
            {isUploading ? 'Uploading…' : 'Analyzing photos…'}
          </div>
        )}

        {/* IntakeAgent readiness — keeper only, encourages richer material */}
        {totalMaterials > 0 && persona === 'keeper' && (
          <IntakeAgent
            subject={subject}
            material={material}
            petMode={petMode}
          />
        )}
      </div>

      {/* ── Sticky create button ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'linear-gradient(to top, #0F0D0A 60%, transparent)',
        padding: '20px 24px 32px',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <button
            onClick={handleGenerate}
            disabled={!canCreate}
            style={{
              width: '100%', padding: '20px 24px', borderRadius: 24,
              border: 'none', cursor: canCreate ? 'pointer' : 'not-allowed',
              background: canCreate
                ? `linear-gradient(135deg, ${gold}, #B07D2A)`
                : 'rgba(255,255,255,0.06)',
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
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12,
              color: 'rgba(255,255,255,0.25)', fontFamily: 'system-ui' }}>
              {totalMaterials} item{totalMaterials !== 1 ? 's' : ''} ready
              {persona === 'keeper' && totalMaterials < 3 ? ' · Add more for a richer story' : ' · Connie will weave it all together'}
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
