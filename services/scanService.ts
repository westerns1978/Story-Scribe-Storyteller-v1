// services/scanService.ts
// ============================================
// Story Scribe Universal Scan Service v2
// ============================================
// - Bridge URL auto-detected (localhost first, then last-known LAN IP)
// - ALL scan paths return PNG (converted at service layer via canvas)
// - Phone camera capture exported as standalone function
// - No hardcoded IPs — scanner-agnostic
// ============================================

const BRIDGE_PORT = 8585;
const BRIDGE_TIMEOUT_MS = 45000;
const BRIDGE_LOCALSTORAGE_KEY = 'storyscribe_bridge_ip';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScanProtocol = 'twain' | 'escl' | 'sane' | 'camera' | 'unknown';

export interface ScannerDevice {
  id: string;
  name: string;
  protocol: ScanProtocol;
  ip?: string;
  twainName?: string;
  available: boolean;
}

export interface BridgeStatus {
  running: boolean;
  bridgeUrl: string;
  version?: string;
  twainAvailable: boolean;
  esclScanners: ScannerInfo[];
  twainScanners: string[];
  saneAvailable: boolean;
}

export interface ScannerInfo {
  id: string;
  name: string;
  ip: string;
  protocol: string;
  model?: string;
}

export interface ScanResult {
  base64: string;        // always PNG
  mimeType: 'image/png';
  protocol: ScanProtocol;
  scannerName: string;
  durationMs: number;
}

export interface ScanOptions {
  resolution?: 150 | 300 | 600;
  colorMode?: 'color' | 'grayscale' | 'blackwhite';
  twainSource?: string;
  showTwainUI?: boolean;
  duplex?: boolean;
  scannerIp?: string;
  bridgeUrl?: string; // override auto-detect
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  ms = 8000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// Convert any base64 image (JPEG/PDF first-page raster) → PNG base64 via canvas
async function toPngBase64(base64: string, mimeType: string): Promise<string> {
  if (mimeType === 'image/png') return base64;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No canvas context')); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png').split(',')[1]);
    };
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Bridge URL discovery ─────────────────────────────────────────────────────
// Tries localhost first, then last-known LAN IP from localStorage

async function probeBridgeUrl(url: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${url}/health`, {}, 2000);
    return res.ok;
  } catch {
    return false;
  }
}

export async function discoverBridgeUrl(): Promise<string | null> {
  // 1. localhost
  const local = `https://localhost:${BRIDGE_PORT}`;
  if (await probeBridgeUrl(local)) {
    localStorage.setItem(BRIDGE_LOCALSTORAGE_KEY, local);
    return local;
  }

  // 2. last-known LAN IP
  const saved = localStorage.getItem(BRIDGE_LOCALSTORAGE_KEY);
  if (saved && saved !== local) {
    if (await probeBridgeUrl(saved)) return saved;
  }

  // 3. Common LAN IP patterns (192.168.1.x, 10.0.0.x)
  const myIp = await getLocalIpHint();
  if (myIp) {
    const candidate = `https://${myIp}:${BRIDGE_PORT}`;
    if (await probeBridgeUrl(candidate)) {
      localStorage.setItem(BRIDGE_LOCALSTORAGE_KEY, candidate);
      return candidate;
    }
  }

  return null;
}

async function getLocalIpHint(): Promise<string | null> {
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return new Promise(resolve => {
      pc.onicecandidate = (e) => {
        if (!e.candidate) { resolve(null); return; }
        const match = e.candidate.candidate.match(/(\d+\.\d+\.\d+)\.\d+/);
        if (match) { pc.close(); resolve(match[1] + '.1'); }
      };
      setTimeout(() => { pc.close(); resolve(null); }, 2000);
    });
  } catch {
    return null;
  }
}

// ─── Bridge status ────────────────────────────────────────────────────────────

export async function getBridgeStatus(bridgeUrl?: string): Promise<BridgeStatus> {
  const url = bridgeUrl || await discoverBridgeUrl();
  const notRunning: BridgeStatus = {
    running: false, bridgeUrl: '', twainAvailable: false,
    esclScanners: [], twainScanners: [], saneAvailable: false,
  };
  if (!url) return notRunning;

  try {
    const res = await fetchWithTimeout(`${url}/health`, {}, 2000);
    if (!res.ok) return notRunning;

    let scanners: any[] = [];
    try {
      const scanRes = await fetchWithTimeout(`${url}/api/scanners`, {}, 3000);
      if (scanRes.ok) {
        const data = await scanRes.json();
        scanners = data.scanners || data || [];
      }
    } catch { /* non-critical */ }

    const esclScanners: ScannerInfo[] = scanners
      .filter((s: any) => (s.protocol || '').toLowerCase().includes('escl'))
      .map((s: any) => ({
        id: s.id || s.ip || '',
        name: s.name || `Scanner @ ${s.ip}`,
        ip: s.ip || s.address || '',
        protocol: 'escl',
        model: s.model,
      }))
      .filter((s: ScannerInfo) => s.ip);

    const twainScanners = scanners
      .filter((s: any) => (s.protocol || '').toLowerCase().includes('twain'))
      .map((s: any) => s.name || s.twainName || s.id || '')
      .filter(Boolean);

    // Also check dedicated TWAIN endpoint
    try {
      const tr = await fetchWithTimeout(`${url}/api/twain/scanners`, {}, 2000);
      if (tr.ok) {
        const td = await tr.json();
        const tl = td.scanners || td.sources || td || [];
        twainScanners.push(...tl.map((s: any) => s.name || s).filter(Boolean));
      }
    } catch { /* ok */ }

    return {
      running: true,
      bridgeUrl: url,
      twainAvailable: twainScanners.length > 0,
      esclScanners,
      twainScanners: [...new Set(twainScanners)],
      saneAvailable: scanners.some((s: any) => (s.protocol || '').toLowerCase().includes('sane')),
    };
  } catch {
    return notRunning;
  }
}

// ─── TWAIN scan ───────────────────────────────────────────────────────────────

async function scanViaTwain(
  bridgeUrl: string,
  options: ScanOptions,
  onProgress: (msg: string) => void
): Promise<ScanResult> {
  onProgress('Connecting to scanner…');
  const colorModeMap = { color: 'RGB', grayscale: 'Gray', blackwhite: 'BlackWhite' };
  const payload: any = {
    resolution: options.resolution ?? 300,
    color_mode: colorModeMap[options.colorMode ?? 'color'],
    format: 'jpeg', // bridge returns jpeg, we convert to PNG
    show_ui: options.showTwainUI ?? false,
    duplex: options.duplex ?? false,
  };
  if (options.twainSource) payload.source = options.twainSource;

  onProgress('Scanning…');
  const start = Date.now();

  const res = await fetchWithTimeout(
    `${bridgeUrl}/api/twain/scan`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    BRIDGE_TIMEOUT_MS
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TWAIN scan failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  let rawBase64 = data.image_base64 || data.base64 || data.data || '';
  const rawMime = data.mime_type || data.mimeType || 'image/jpeg';

  if (!rawBase64 && data.image_url) {
    onProgress('Retrieving image…');
    const imgRes = await fetchWithTimeout(data.image_url, {}, 15000);
    if (!imgRes.ok) throw new Error('Could not retrieve scanned image');
    rawBase64 = await blobToBase64(await imgRes.blob());
  }
  if (!rawBase64) throw new Error('TWAIN scan returned no image data');

  onProgress('Converting to PNG…');
  const base64 = await toPngBase64(rawBase64, rawMime);

  return {
    base64, mimeType: 'image/png', protocol: 'twain',
    scannerName: options.twainSource || data.scanner_name || 'TWAIN Scanner',
    durationMs: Date.now() - start,
  };
}

// ─── eSCL scan ────────────────────────────────────────────────────────────────

async function scanViaEscl(
  bridgeUrl: string,
  ip: string,
  options: ScanOptions,
  onProgress: (msg: string) => void
): Promise<ScanResult> {
  onProgress('Connecting to scanner…');
  const start = Date.now();

  const res = await fetchWithTimeout(
    `${bridgeUrl}/api/scan`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scanner_ip: ip,
        resolution: options.resolution ?? 300,
        color_mode: options.colorMode ?? 'color',
        format: 'jpeg',
      }),
    },
    BRIDGE_TIMEOUT_MS
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eSCL scan failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawBase64 = data.image_base64 || data.base64 || '';
  if (!rawBase64) throw new Error('No image data returned from scanner');

  onProgress('Converting to PNG…');
  const base64 = await toPngBase64(rawBase64, data.mime_type || 'image/jpeg');
  const scannerName = data.scanner_name || `Scanner @ ${ip}`;

  return { base64, mimeType: 'image/png', protocol: 'escl', scannerName, durationMs: Date.now() - start };
}

// ─── Generic bridge scan ──────────────────────────────────────────────────────

async function scanViaBridge(
  bridgeUrl: string,
  options: ScanOptions,
  onProgress: (msg: string) => void
): Promise<ScanResult> {
  onProgress('Scanning…');
  const start = Date.now();
  const payload: any = { resolution: options.resolution ?? 300, color_mode: options.colorMode ?? 'color', format: 'jpeg' };
  if (options.scannerIp) payload.scanner_ip = options.scannerIp;
  if (options.twainSource) payload.twain_source = options.twainSource;

  const res = await fetchWithTimeout(
    `${bridgeUrl}/api/scan`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    BRIDGE_TIMEOUT_MS
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bridge scan failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const contentType = res.headers.get('content-type') || '';
  let rawBase64 = '', rawMime = 'image/jpeg';

  if (contentType.includes('application/json')) {
    const data = await res.json();
    rawBase64 = data.image_base64 || data.base64 || data.data || '';
    rawMime = data.mime_type || 'image/jpeg';
    if (!rawBase64 && data.image_url) {
      const imgRes = await fetchWithTimeout(data.image_url, {}, 15000);
      const blob = await imgRes.blob();
      rawBase64 = await blobToBase64(blob);
      rawMime = blob.type || 'image/jpeg';
    }
  } else {
    const blob = await res.blob();
    rawBase64 = await blobToBase64(blob);
    rawMime = blob.type || 'image/jpeg';
  }

  if (!rawBase64) throw new Error('Scan returned no image data');

  onProgress('Converting to PNG…');
  const base64 = await toPngBase64(rawBase64, rawMime);
  return { base64, mimeType: 'image/png', protocol: 'unknown', scannerName: 'Scanner', durationMs: Date.now() - start };
}

// ─── Phone camera capture ─────────────────────────────────────────────────────
// Standalone — no bridge needed. Returns PNG base64.

export async function captureFromCamera(
  videoElement: HTMLVideoElement
): Promise<ScanResult> {
  const start = Date.now();
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.drawImage(videoElement, 0, 0);
  const base64 = canvas.toDataURL('image/png').split(',')[1];
  return { base64, mimeType: 'image/png', protocol: 'camera', scannerName: 'Camera', durationMs: Date.now() - start };
}

// ─── MAIN EXPORT: Universal scan ─────────────────────────────────────────────

export async function scan(
  options: ScanOptions = {},
  onProgress: (msg: string) => void = () => {}
): Promise<ScanResult> {
  onProgress('Looking for scanner…');

  const bridge = await getBridgeStatus(options.bridgeUrl);

  if (!bridge.running) {
    throw new Error(
      'Scanner bridge not found. Start flowhub_bridge.py on your computer to enable scanning, or use the camera option.'
    );
  }

  const url = bridge.bridgeUrl;

  // TWAIN explicit or USB-preferred
  if (options.twainSource || (bridge.twainAvailable && !options.scannerIp)) {
    try {
      return await scanViaTwain(url, options, onProgress);
    } catch (e: any) {
      console.warn('[ScanService] TWAIN failed, falling back to eSCL:', e.message);
      onProgress('Trying network scanner…');
    }
  }

  // eSCL network
  const targetIp = options.scannerIp || bridge.esclScanners[0]?.ip;
  if (targetIp) return scanViaEscl(url, targetIp, options, onProgress);

  // Generic fallback
  return scanViaBridge(url, options, onProgress);
}

// ─── Available scanners for UI ────────────────────────────────────────────────

export async function getAvailableScanners(): Promise<ScannerDevice[]> {
  const bridge = await getBridgeStatus();
  const devices: ScannerDevice[] = [];

  if (!bridge.running) {
    return [{ id: 'no_bridge', name: 'Scanner bridge not running', protocol: 'unknown', available: false }];
  }

  bridge.twainScanners.forEach((name, i) => {
    devices.push({ id: `twain_${i}`, name, protocol: 'twain', twainName: name, available: true });
  });

  bridge.esclScanners.forEach((s) => {
    devices.push({ id: `escl_${s.ip}`, name: s.name, protocol: 'escl', ip: s.ip, available: true });
  });

  if (bridge.saneAvailable) {
    devices.push({ id: 'sane_default', name: 'USB Scanner (SANE)', protocol: 'sane', available: true });
  }

  return devices.length > 0 ? devices : [{ id: 'no_scanner', name: 'No scanners found', protocol: 'unknown', available: false }];
}

// ─── Preferences ─────────────────────────────────────────────────────────────

const PREFS_KEY = 'storyscribe_scan_prefs';

export interface ScanPrefs {
  preferredProtocol?: ScanProtocol;
  preferredTwainSource?: string;
  preferredIp?: string;
  resolution: 150 | 300 | 600;
  colorMode: 'color' | 'grayscale' | 'blackwhite';
}

export function getScanPrefs(): ScanPrefs {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); }
  catch { return { resolution: 300, colorMode: 'color' }; }
}

export function saveScanPrefs(prefs: Partial<ScanPrefs>): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...getScanPrefs(), ...prefs }));
}
