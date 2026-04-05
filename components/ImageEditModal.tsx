// components/ImageEditModal.tsx
// ============================================
// Scene-level image editing for Wissums
// User taps any generated scene → types a correction → one image regenerates
// Everything else in the story stays untouched
// Band of Brothers principle: wrong image breaks trust, right image seals it
// ============================================

import React, { useState, useCallback } from 'react';
import { regenerateSceneImage } from '../services/imageEditService';

export interface SceneToEdit {
  beatIndex: number;
  beatTitle: string;
  originalPrompt: string;
  currentImageUrl: string;
  storytellerName: string;
}

interface ImageEditModalProps {
  scene: SceneToEdit;
  onSave: (beatIndex: number, newImageUrl: string, revisedPrompt: string) => void;
  onClose: () => void;
}

// ─── Quick suggestion chips ───────────────────────────────────────────────────

const SUGGESTIONS = [
  'Make it more painterly and artistic',
  'She had grey hair and glasses',
  'Use warmer, golden tones',
  'More impressionistic, less realistic',
  'Set this in a rural / farm setting',
  'Change to an indoor scene',
  'Make it feel more joyful',
  'She was African American',
  'He had a beard and was heavyset',
  'More like a watercolor painting',
];

// ─── Styles ──────────────────────────────────────────────────────────────────

const GOLD = '#C4973B';
const CREAM = 'rgba(245,236,215,0.9)';
const DIM = 'rgba(245,236,215,0.4)';
const FAINT = 'rgba(245,236,215,0.08)';
const BORDER = 'rgba(196,151,59,0.2)';
const BG = '#0D0B0A';

export const ImageEditModal: React.FC<ImageEditModalProps> = ({
  scene, onSave, onClose,
}) => {
  const [modifier, setModifier] = useState('');
  const [state, setState] = useState<'idle' | 'generating' | 'preview' | 'error'>('idle');
  const [progress, setProgress] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [revisedPrompt, setRevisedPrompt] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = useCallback(async () => {
    if (!modifier.trim()) return;
    setState('generating');
    setError('');
    try {
      const result = await regenerateSceneImage(
        {
          originalPrompt: scene.originalPrompt,
          modifier: modifier.trim(),
          beatTitle: scene.beatTitle,
          storytellerName: scene.storytellerName,
        },
        msg => setProgress(msg)
      );
      setPreviewUrl(result.image_url);
      setRevisedPrompt(result.revised_prompt);
      setState('preview');
    } catch (e: any) {
      setError(e.message || 'Generation failed — please try again');
      setState('error');
    }
  }, [modifier, scene]);

  const handleAccept = useCallback(() => {
    onSave(scene.beatIndex, previewUrl, revisedPrompt);
    onClose();
  }, [scene.beatIndex, previewUrl, revisedPrompt, onSave, onClose]);

  const handleRetry = useCallback(() => {
    setState('idle');
    setPreviewUrl('');
    setError('');
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(8,6,4,0.92)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 540,
        background: BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${FAINT}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontSize: 9, fontWeight: 900, letterSpacing: '.4em',
              textTransform: 'uppercase', color: 'rgba(196,151,59,0.5)',
              fontFamily: 'system-ui', marginBottom: 4,
            }}>
              Edit Scene
            </div>
            <div style={{
              fontFamily: 'Georgia, serif', fontSize: 17, color: CREAM,
              lineHeight: 1.3,
            }}>
              {scene.beatTitle}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            color: DIM, fontSize: 20, cursor: 'pointer', padding: 4,
          }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '20px 24px' }}>

            {/* Side by side: current vs new */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {/* Current image */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 8, fontWeight: 900, letterSpacing: '.35em',
                  textTransform: 'uppercase', color: DIM,
                  fontFamily: 'system-ui', marginBottom: 6, textAlign: 'center',
                }}>Current</div>
                <div style={{
                  borderRadius: 10, overflow: 'hidden',
                  border: `1px solid ${FAINT}`,
                  aspectRatio: '4/3', background: '#1a1208',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {scene.currentImageUrl ? (
                    <img
                      src={scene.currentImageUrl}
                      alt="Current scene"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ color: DIM, fontSize: 11, fontFamily: 'system-ui' }}>
                      No image
                    </span>
                  )}
                </div>
              </div>

              {/* New image / generating state */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 8, fontWeight: 900, letterSpacing: '.35em',
                  textTransform: 'uppercase',
                  color: state === 'preview' ? GOLD : DIM,
                  fontFamily: 'system-ui', marginBottom: 6, textAlign: 'center',
                }}>
                  {state === 'preview' ? 'New Scene' : 'Preview'}
                </div>
                <div style={{
                  borderRadius: 10, overflow: 'hidden',
                  border: `1px solid ${state === 'preview' ? BORDER : FAINT}`,
                  aspectRatio: '4/3', background: '#1a1208',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 8,
                }}>
                  {state === 'generating' && (
                    <>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        border: `2px solid rgba(196,151,59,0.15)`,
                        borderTop: `2px solid ${GOLD}`,
                        animation: 'spin 1s linear infinite',
                      }} />
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      <span style={{
                        color: DIM, fontSize: 10,
                        fontFamily: 'system-ui', textAlign: 'center',
                        padding: '0 8px',
                      }}>
                        {progress || 'Crafting scene…'}
                      </span>
                    </>
                  )}
                  {state === 'preview' && previewUrl && (
                    <img
                      src={previewUrl}
                      alt="New scene"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  {(state === 'idle' || state === 'error') && (
                    <span style={{
                      color: 'rgba(245,236,215,0.15)',
                      fontSize: 11, fontFamily: 'system-ui',
                    }}>
                      {state === 'error' ? '⚠' : '✦'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Error */}
            {state === 'error' && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.2)',
              }}>
                <p style={{ color: '#f87171', fontSize: 12, margin: 0, fontFamily: 'system-ui' }}>
                  {error}
                </p>
              </div>
            )}

            {/* What's wrong input */}
            {state !== 'preview' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{
                    fontSize: 9, fontWeight: 900, letterSpacing: '.35em',
                    textTransform: 'uppercase', color: 'rgba(196,151,59,0.5)',
                    display: 'block', marginBottom: 8,
                    fontFamily: 'system-ui',
                  }}>
                    What needs to change?
                  </label>
                  <textarea
                    value={modifier}
                    onChange={e => setModifier(e.target.value)}
                    placeholder="She had short grey hair and wore glasses… or Make it more painterly… or Set this outdoors in autumn…"
                    rows={3}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 10, padding: '12px 14px',
                      color: CREAM, fontSize: 14,
                      fontFamily: 'Georgia, serif', fontStyle: 'italic',
                      outline: 'none', resize: 'none',
                      lineHeight: 1.5,
                    }}
                    autoFocus
                  />
                </div>

                {/* Quick suggestion chips */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: 8, fontWeight: 900, letterSpacing: '.35em',
                    textTransform: 'uppercase', color: 'rgba(245,236,215,0.2)',
                    fontFamily: 'system-ui', marginBottom: 8,
                  }}>
                    Quick suggestions
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => setModifier(s)}
                        style={{
                          padding: '5px 10px', borderRadius: 100,
                          background: modifier === s
                            ? 'rgba(196,151,59,0.15)'
                            : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${modifier === s ? BORDER : 'rgba(255,255,255,0.06)'}`,
                          color: modifier === s ? GOLD : DIM,
                          fontSize: 10, cursor: 'pointer',
                          fontFamily: 'system-ui',
                          transition: 'all .15s',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={state === 'error' ? handleRetry : handleGenerate}
                  disabled={!modifier.trim() || state === 'generating'}
                  style={{
                    width: '100%', padding: '14px',
                    background: modifier.trim() && state !== 'generating'
                      ? 'linear-gradient(135deg, #C4973B 0%, #a07830 100%)'
                      : 'rgba(255,255,255,0.05)',
                    border: 'none', borderRadius: 10,
                    color: modifier.trim() && state !== 'generating' ? '#0a0806' : DIM,
                    fontSize: 12, fontWeight: 900,
                    letterSpacing: '.2em', textTransform: 'uppercase',
                    cursor: modifier.trim() && state !== 'generating' ? 'pointer' : 'default',
                    fontFamily: 'system-ui',
                    transition: 'all .2s',
                  }}
                >
                  {state === 'generating'
                    ? 'Generating…'
                    : state === 'error'
                      ? 'Try Again →'
                      : 'Generate New Scene →'}
                </button>
              </>
            )}

            {/* Preview accept/retry */}
            {state === 'preview' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleAccept}
                  style={{
                    flex: 2, padding: '14px',
                    background: 'linear-gradient(135deg, #C4973B 0%, #a07830 100%)',
                    border: 'none', borderRadius: 10,
                    color: '#0a0806', fontSize: 12, fontWeight: 900,
                    letterSpacing: '.2em', textTransform: 'uppercase',
                    cursor: 'pointer', fontFamily: 'system-ui',
                  }}
                >
                  Use This Scene ✓
                </button>
                <button
                  onClick={handleRetry}
                  style={{
                    flex: 1, padding: '14px',
                    background: FAINT,
                    border: `1px solid rgba(255,255,255,0.08)`,
                    borderRadius: 10,
                    color: DIM, fontSize: 11, fontWeight: 900,
                    letterSpacing: '.15em', textTransform: 'uppercase',
                    cursor: 'pointer', fontFamily: 'system-ui',
                  }}
                >
                  Try Again
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditModal;
