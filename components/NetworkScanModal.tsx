// components/NetworkScanModal.tsx
// ============================================
// Driverless eSCL network scanner for Wissums
// Works with any Epson, Ricoh, Fujitsu, Canon, Brother network scanner
// Routes through FlowHub bridge at localhost:8585 to avoid CORS
// Feeds directly into existing handleScanComplete pipeline
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  getScannerInfo, scanPage, getSavedScannerIps, saveScannerIp,
  removeScannerIp, isBridgeRunning, EsclScanOptions, ScannerInfo
} from '../services/esclService';
import { ScanResult } from './CameraScanner';

interface NetworkScanModalProps {
  onScanComplete: (result: ScanResult) => void;
  onClose: () => void;
}

type ModalState = 'setup' | 'connecting' | 'ready' | 'scanning' | 'done' | 'error';

// ─── Styles (matches Wissums aesthetic) ──────────────────────────────────

const BG = '#0D0B0A';
const GOLD = '#C4973B';
const CREAM = 'rgba(245,236,215,0.85)';
const DIM = 'rgba(245,236,215,0.4)';
const FAINT = 'rgba(245,236,215,0.1)';
const PANEL = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(196,151,59,0.2)';

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${BORDER}`,
  borderRadius: 10, padding: '12px 16px',
  color: CREAM, fontSize: 15,
  fontFamily: 'Georgia, serif', fontStyle: 'italic',
  outline: 'none', transition: 'border-color .2s',
};

const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 900, letterSpacing: '.35em',
  textTransform: 'uppercase', color: `rgba(196,151,59,0.5)`,
  display: 'block', marginBottom: 8,
  fontFamily: 'system-ui, sans-serif',
};

const primaryBtn = (disabled = false): React.CSSProperties => ({
  width: '100%', padding: '14px',
  background: disabled
    ? 'rgba(255,255,255,0.05)'
    : 'linear-gradient(135deg, #C4973B 0%, #a07830 100%)',
  border: 'none', borderRadius: 10,
  color: disabled ? DIM : '#0a0806',
  fontSize: 12, fontWeight: 900,
  letterSpacing: '.2em', textTransform: 'uppercase',
  cursor: disabled ? 'default' : 'pointer',
  fontFamily: 'system-ui, sans-serif',
  transition: 'all .2s',
});

const ghostBtn: React.CSSProperties = {
  background: 'none', border: 'none',
  color: DIM, fontSize: 11, cursor: 'pointer',
  letterSpacing: '.1em', fontFamily: 'system-ui',
  padding: '4px 0',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusDot: React.FC<{ status: 'ok' | 'warn' | 'err' | 'idle' }> = ({ status }) => {
  const colors = { ok: '#4ade80', warn: GOLD, err: '#f87171', idle: DIM };
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8,
      borderRadius: '50%', background: colors[status],
      marginRight: 6, flexShrink: 0,
    }} />
  );
};

const ScannerCard: React.FC<{
  info: ScannerInfo;
  onScan: () => void;
  onForget: () => void;
  scanning: boolean;
}> = ({ info, onScan, onForget, scanning }) => (
  <div style={{
    padding: '16px 20px', borderRadius: 12,
    background: 'rgba(196,151,59,0.06)',
    border: `1px solid rgba(196,151,59,0.2)`,
    marginBottom: 12,
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <StatusDot status={info.status === 'idle' ? 'ok' : info.status === 'scanning' ? 'warn' : 'err'} />
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: CREAM }}>{info.name}</span>
        </div>
        <div style={{ fontSize: 10, color: DIM, fontFamily: 'system-ui', letterSpacing: '.05em' }}>
          {info.manufacturer} · {info.ip}
        </div>
        <div style={{ fontSize: 10, color: DIM, fontFamily: 'system-ui', marginTop: 3 }}>
          {info.resolutions.join(', ')} dpi · {info.colorModes.includes('RGB24') ? 'Color' : 'Mono'}
        </div>
      </div>
      <button onClick={onForget} style={{ ...ghostBtn, fontSize: 10, opacity: 0.5 }}>forget</button>
    </div>
    <button
      style={primaryBtn(scanning || info.status !== 'idle')}
      onClick={onScan}
      disabled={scanning || info.status !== 'idle'}
    >
      {scanning ? 'Scanning…' : info.status === 'scanning' ? 'Scanner busy…' : 'Scan Page →'}
    </button>
  </div>
);

// ─── Preview ──────────────────────────────────────────────────────────────────

const ScannedPreview: React.FC<{
  base64: string;
  mimeType: string;
  onUse: () => void;
  onRescan: () => void;
}> = ({ base64, mimeType, onUse, onRescan }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.4em', textTransform: 'uppercase', color: `rgba(196,151,59,0.5)`, marginBottom: 12, fontFamily: 'system-ui' }}>
      Scan Complete
    </div>
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${BORDER}`,
      marginBottom: 16, background: '#000',
      maxHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <img
        src={`data:${mimeType};base64,${base64}`}
        alt="Scanned document"
        style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain' }}
      />
    </div>
    <div style={{ display: 'flex', gap: 10 }}>
      <button style={{ ...primaryBtn(), flex: 2 }} onClick={onUse}>
        Use This Scan →
      </button>
      <button
        style={{ flex: 1, padding: '14px', background: PANEL, border: `1px solid ${FAINT}`, borderRadius: 10, color: DIM, fontSize: 11, fontWeight: 900, letterSpacing: '.15em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'system-ui' }}
        onClick={onRescan}
      >
        Rescan
      </button>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const NetworkScanModal: React.FC<NetworkScanModalProps> = ({ onScanComplete, onClose }) => {
  const [state, setState] = useState<ModalState>('setup');
  const [ipInput, setIpInput] = useState('');
  const [savedIps, setSavedIps] = useState<string[]>([]);
  const [scannerInfo, setScannerInfo] = useState<ScannerInfo | null>(null);
  const [scanOptions, setScanOptions] = useState<EsclScanOptions>({
    resolution: 300,
    colorMode: 'RGB24',
    intent: 'Photo',
  });
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [scannedBase64, setScannedBase64] = useState('');
  const [scannedMime, setScannedMime] = useState('image/jpeg');
  const [bridgeOk, setBridgeOk] = useState<boolean | null>(null);

  // Check bridge on mount
  useEffect(() => {
    setSavedIps(getSavedScannerIps());
    isBridgeRunning().then(ok => setBridgeOk(ok));
  }, []);

  const handleConnect = useCallback(async (ip?: string) => {
    const target = (ip || ipInput).trim();
    if (!target) return;
    setState('connecting');
    setError('');
    setProgress('Connecting to scanner…');
    try {
      const info = await getScannerInfo(target);
      setScannerInfo(info);
      saveScannerIp(target);
      setSavedIps(getSavedScannerIps());
      setState('ready');
    } catch (e: any) {
      setError(e.message || 'Could not connect to scanner');
      setState('error');
    }
  }, [ipInput]);

  const handleScan = useCallback(async () => {
    if (!scannerInfo) return;
    setState('scanning');
    setError('');
    try {
      const result = await scanPage(scannerInfo.ip, scanOptions, msg => setProgress(msg));
      setScannedBase64(result.base64);
      setScannedMime(result.mimeType);
      setState('done');
    } catch (e: any) {
      setError(e.message || 'Scan failed');
      setState('error');
    }
  }, [scannerInfo, scanOptions]);

  const handleUse = useCallback(() => {
    // Build a ScanResult that matches existing handleScanComplete signature
    const scanResult: ScanResult = {
      base64: scannedBase64,
      type: scanOptions.intent === 'Document' || scanOptions.intent === 'TextAndGraphic'
        ? 'document'
        : 'photo',
      documentType: scanOptions.intent === 'Document' ? 'Scanned Document' : 'Scanned Photo',
      transcribedText: '', // Gemini analysis happens in handleScanComplete
    };
    onScanComplete(scanResult);
    onClose();
  }, [scannedBase64, scanOptions.intent, onScanComplete, onClose]);

  const handleForget = (ip: string) => {
    removeScannerIp(ip);
    setSavedIps(getSavedScannerIps());
    if (scannerInfo?.ip === ip) {
      setScannerInfo(null);
      setState('setup');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(8,6,4,0.9)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: BG, border: `1px solid ${BORDER}`,
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${FAINT}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.4em', textTransform: 'uppercase', color: `rgba(196,151,59,0.5)`, marginBottom: 4, fontFamily: 'system-ui' }}>
              Wissums
            </div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: CREAM }}>
              Scan from Network Scanner
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: DIM, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px 28px', overflowY: 'auto', maxHeight: '70vh' }}>

          {/* Bridge status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 8,
            background: bridgeOk === false ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.06)',
            border: `1px solid ${bridgeOk === false ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.15)'}`,
            marginBottom: 20,
          }}>
            <StatusDot status={bridgeOk === null ? 'idle' : bridgeOk ? 'ok' : 'err'} />
            <span style={{ fontSize: 11, color: bridgeOk === false ? '#f87171' : DIM, fontFamily: 'system-ui' }}>
              {bridgeOk === null
                ? 'Checking FlowHub bridge…'
                : bridgeOk
                  ? 'FlowHub bridge running — driverless scanning ready'
                  : 'FlowHub bridge not running — start flowhub_bridge.py first'}
            </span>
          </div>

          {/* Error state */}
          {state === 'error' && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
            }}>
              <p style={{ color: '#f87171', fontSize: 13, margin: 0, fontFamily: 'system-ui' }}>{error}</p>
              <button style={{ ...ghostBtn, color: '#f87171', marginTop: 8 }} onClick={() => setState('setup')}>
                ← Try again
              </button>
            </div>
          )}

          {/* Done — show preview */}
          {state === 'done' ? (
            <ScannedPreview
              base64={scannedBase64}
              mimeType={scannedMime}
              onUse={handleUse}
              onRescan={() => { setState('ready'); setScannedBase64(''); }}
            />
          ) : state === 'scanning' ? (
            // Scanning progress
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                border: `2px solid rgba(196,151,59,0.15)`,
                borderTop: `2px solid ${GOLD}`,
                margin: '0 auto 20px',
                animation: 'spin 1s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: DIM, fontSize: 15 }}>
                {progress || 'Scanning…'}
              </p>
            </div>
          ) : (
            <>
              {/* Connected scanner */}
              {scannerInfo && state === 'ready' && (
                <>
                  <ScannerCard
                    info={scannerInfo}
                    onScan={handleScan}
                    onForget={() => handleForget(scannerInfo.ip)}
                    scanning={false}
                  />

                  {/* Scan options */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Scan Type</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['Photo', 'Document', 'TextAndGraphic'] as const).map(intent => (
                        <button
                          key={intent}
                          onClick={() => setScanOptions(o => ({ ...o, intent }))}
                          style={{
                            flex: 1, padding: '9px 4px', borderRadius: 8,
                            background: scanOptions.intent === intent ? 'rgba(196,151,59,0.15)' : PANEL,
                            border: `1px solid ${scanOptions.intent === intent ? 'rgba(196,151,59,0.4)' : FAINT}`,
                            color: scanOptions.intent === intent ? GOLD : DIM,
                            fontSize: 10, fontWeight: 900, letterSpacing: '.1em',
                            textTransform: 'uppercase', cursor: 'pointer',
                            fontFamily: 'system-ui',
                          }}
                        >
                          {intent === 'TextAndGraphic' ? 'Mixed' : intent}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Resolution</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {([300, 600] as const).map(res => (
                        <button
                          key={res}
                          onClick={() => setScanOptions(o => ({ ...o, resolution: res }))}
                          style={{
                            flex: 1, padding: '9px 4px', borderRadius: 8,
                            background: scanOptions.resolution === res ? 'rgba(196,151,59,0.15)' : PANEL,
                            border: `1px solid ${scanOptions.resolution === res ? 'rgba(196,151,59,0.4)' : FAINT}`,
                            color: scanOptions.resolution === res ? GOLD : DIM,
                            fontSize: 10, fontWeight: 900, letterSpacing: '.1em',
                            textTransform: 'uppercase', cursor: 'pointer',
                            fontFamily: 'system-ui',
                          }}
                        >
                          {res} dpi {res === 300 ? '· Fast' : '· Detail'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Saved scanners */}
              {savedIps.length > 0 && state !== 'ready' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Recent Scanners</label>
                  {savedIps.map(ip => (
                    <div key={ip} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 10,
                      background: PANEL, border: `1px solid ${FAINT}`,
                      marginBottom: 6,
                    }}>
                      <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: DIM, fontSize: 14 }}>{ip}</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button style={{ ...ghostBtn, color: GOLD }} onClick={() => handleConnect(ip)}>
                          Connect
                        </button>
                        <button style={{ ...ghostBtn, opacity: 0.4 }} onClick={() => handleForget(ip)}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* IP entry */}
              {state !== 'ready' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Scanner IP Address</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      type="text"
                      value={ipInput}
                      placeholder="192.168.1.145"
                      onChange={e => setIpInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleConnect()}
                    />
                    <button
                      style={{
                        padding: '12px 18px', borderRadius: 10,
                        background: 'rgba(196,151,59,0.15)',
                        border: `1px solid rgba(196,151,59,0.3)`,
                        color: GOLD, fontSize: 12, fontWeight: 900,
                        letterSpacing: '.15em', textTransform: 'uppercase',
                        cursor: 'pointer', fontFamily: 'system-ui',
                        whiteSpace: 'nowrap',
                      }}
                      onClick={() => handleConnect()}
                      disabled={state === 'connecting'}
                    >
                      {state === 'connecting' ? '…' : 'Connect'}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(245,236,215,0.2)', fontFamily: 'system-ui', marginTop: 8, lineHeight: 1.5 }}>
                    Find your scanner's IP in its network settings or your router's device list.
                    Works with Epson, Ricoh, Fujitsu, Canon, Brother — any eSCL-capable scanner.
                  </p>
                </div>
              )}

              {state === 'ready' && (
                <button style={ghostBtn} onClick={() => { setState('setup'); setScannerInfo(null); }}>
                  ← Connect a different scanner
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkScanModal;
