// services/scanService.ts
// ============================================
// Story Scribe Universal Scan Service
// ============================================
// Routes through FlowHub bridge (localhost:8585) which handles:
//   TWAIN Classic (USB)     → /api/twain/scan
//   TWAIN Direct (network)  → /api/twain/scan  
//   eSCL (WiFi/network)     → /escl/{ip}/...
//   SANE (Linux/USB)        → /api/scan (auto-detected by bridge)
//
// Priority order when bridge is present:
//   1. TWAIN (USB) — highest quality, most reliable for Ambir/Epson USB
//   2. eSCL (network) — driverless WiFi scanners
//   3. SANE — Linux fallback
//
// If bridge is NOT running, falls back to direct eSCL (same-network only)
// ============================================

// LAN IP used over HTTPS — localhost is blocked from secure origins (Firebase/PWA)
// User's FlowHub bridge IP — saved in localStorage or defaults to LAN IP
const getDefaultBridgeIp = () => {
  try { return JSON.parse(localStorage.getItem('storyscribe_scan_prefs') || '{}').preferredIp || '192.168.1.169'; }
  catch { return '192.168.1.169'; }
};
const BRIDGE_BASE = `https://${getDefaultBridgeIp()}:8585`;
const BRIDGE_TIMEOUT_MS = 45000; // 45s — TWAIN scans can be slow

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScanProtocol = 'twain' | 'escl' | 'sane' | 'unknown';

export interface ScannerDevice {
  id: string;
  name: string;
  protocol: ScanProtocol;
  ip?: string;        // for network scanners
  twainName?: string; // for TWAIN scanners — exact DS name
  available: boolean;
}

export interface BridgeStatus {
  running: boolean;
  version?: string;
  twainAvailable: boolean;
  esclScanners: string[];   // IPs of discovered eSCL scanners
  twainScanners: string[];  // TWAIN DS names
  saneAvailable: boolean;
}

export interface ScanResult {
  base64: string;
  mimeType: string;
  protocol: ScanProtocol;
  scannerName: string;
  durationMs: number;
}

export interface ScanOptions {
  resolution?: 150 | 300 | 600;
  colorMode?: 'color' | 'grayscale' | 'blackwhite';
  format?: 'jpeg' | 'pdf';
  // TWAIN-specific
  twainSource?: string;    // DS name, e.g. "EPSON DS-790WN"
  showTwainUI?: boolean;   // show native TWAIN dialog
  duplex?: boolean;
  // eSCL-specific
  scannerIp?: string;
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

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Bridge status check ──────────────────────────────────────────────────────

export async function getBridgeStatus(): Promise<BridgeStatus> {
  try {
    const res = await fetchWithTimeout(`${BRIDGE_BASE}/health`, {}, 2000);
    if (!res.ok) return { running: false, twainAvailable: false, esclScanners: [], twainScanners: [], saneAvailable: false };

    // Also hit /api/scanners for full scanner list
    let scanners: any[] = [];
    try {
      const scanRes = await fetchWithTimeout(`${BRIDGE_BASE}/api/scanners`, {}, 3000);
      if (scanRes.ok) {
        const data = await scanRes.json();
        scanners = data.scanners || data || [];
      }
    } catch { /* non-critical */ }

    const esclScanners = scanners
      .filter((s: any) => (s.protocol || '').toLowerCase().includes('escl'))
      .map((s: any) => s.ip || s.address || '')
      .filter(Boolean);

    const twainScanners = scanners
      .filter((s: any) => (s.protocol || '').toLowerCase().includes('twain'))
      .map((s: any) => s.name || s.twainName || s.id || '')
      .filter(Boolean);

    // Check TWAIN availability specifically
    let twainAvailable = twainScanners.length > 0;
    try {
      const twainRes = await fetchWithTimeout(`${BRIDGE_BASE}/api/twain/scanners`, {}, 2000);
      if (twainRes.ok) {
        const data = await twainRes.json();
        const twainList = data.scanners || data.sources || data || [];
        twainScanners.push(...twainList.map((s: any) => s.name || s).filter(Boolean));
        twainAvailable = twainScanners.length > 0;
      }
    } catch { /* bridge may not have this endpoint */ }

    return {
      running: true,
      twainAvailable,
      esclScanners: [...new Set(esclScanners)],
      twainScanners: [...new Set(twainScanners)],
      saneAvailable: scanners.some((s: any) => (s.protocol || '').toLowerCase().includes('sane')),
    };
  } catch {
    return { running: false, twainAvailable: false, esclScanners: [], twainScanners: [], saneAvailable: false };
  }
}

// ─── TWAIN scan via FlowHub bridge ───────────────────────────────────────────

async function scanViaTwain(
  options: ScanOptions,
  onProgress: (msg: string) => void
): Promise<ScanResult> {
  onProgress('Connecting to TWAIN scanner…');

  const colorModeMap = {
    color: 'RGB',
    grayscale: 'Gray',
    blackwhite: 'BlackWhite',
  };

  const payload: any = {
    resolution: options.resolution ?? 300,
    color_mode: colorModeMap[options.colorMode ?? 'color'],
    format: options.format ?? 'jpeg',
    show_ui: options.showTwainUI ?? false,
    duplex: options.duplex ?? false,
  };
  if (options.twainSource) payload.source = options.twainSource;

  onProgress('Starting TWAIN scan…');
  const start = Date.now();

  const res = await fetchWithTimeout(
    `${BRIDGE_BASE}/api/twain/scan`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    BRIDGE_TIMEOUT_MS
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TWAIN scan failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();

  // Bridge returns base64 directly or as a blob URL
  let base64 = data.image_base64 || data.base64 || data.data || '';
  const mimeType = data.mime_type || data.mimeType || 'image/jpeg';

  if (!base64 && data.image_url) {
    // Bridge returned a URL — fetch and convert
    onProgress('Retrieving scanned image…');
    const imgRes = await fetchWithTimeout(data.image_url, {}, 15000);
    if (!imgRes.ok) throw new Error('Could not retrieve scanned image from bridge');
    const blob = await imgRes.blob();
    base64 = await blobToBase64(blob);
  }

  if (!base64) throw new Error('TWAIN scan completed but no image data returned');

  return {
    base64,
    mimeType,
    protocol: 'twain',
    scannerName: options.twainSource || data.scanner_name || 'TWAIN Scanner',
    durationMs: Date.now() - start,
  };
}

// ─── eSCL scan via FlowHub bridge ─────────────────────────────────────────────

async function scanViaEscl(
  ip: string,
  options: ScanOptions,
  onProgress: (msg: string) => void
): Promise<ScanResult> {
  // Use the existing esclService logic via the bridge
  const { scanPage } = await import('./esclService');
  onProgress('Connecting to network scanner…');
  const start = Date.now();

  const esclOptions = {
    resolution: options.resolution ?? 300,
    colorMode: options.colorMode === 'color' ? 'RGB24' as const
      : options.colorMode === 'blackwhite' ? 'BlackAndWhite1' as const
      : 'Grayscale8' as const,
    intent: 'Photo' as const,
    format: 'image/jpeg' as const,
  };

  const result = await scanPage(ip, esclOptions, onProgress);

  return {
    base64: result.base64,
    mimeType: result.mimeType,
    protocol: 'escl',
    scannerName: `Network Scanner @ ${ip}`,
    durationMs: Date.now() - start,
  };
}

// ─── Generic bridge scan (auto-protocol) ─────────────────────────────────────
// Uses /api/scan which lets the bridge decide protocol

async function scanViaBridge(
  options: ScanOptions,
  onProgress: (msg: string) => void
): Promise<ScanResult> {
  onProgress('Starting scan…');
  const start = Date.now();

  const payload: any = {
    resolution: options.resolution ?? 300,
    color_mode: options.colorMode ?? 'color',
    format: options.format ?? 'jpeg',
  };
  if (options.scannerIp) payload.scanner_ip = options.scannerIp;
  if (options.twainSource) payload.twain_source = options.twainSource;

  const res = await fetchWithTimeout(
    `${BRIDGE_BASE}/api/scan`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    BRIDGE_TIMEOUT_MS
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bridge scan failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const contentType = res.headers.get('content-type') || '';
  let base64: string;
  let mimeType = 'image/jpeg';

  if (contentType.includes('application/json')) {
    const data = await res.json();
    base64 = data.image_base64 || data.base64 || data.data || '';
    mimeType = data.mime_type || 'image/jpeg';
    if (!base64 && data.image_url) {
      const imgRes = await fetchWithTimeout(data.image_url, {}, 15000);
      const blob = await imgRes.blob();
      base64 = await blobToBase64(blob);
      mimeType = blob.type || 'image/jpeg';
    }
  } else {
    // Binary response
    const blob = await res.blob();
    base64 = await blobToBase64(blob);
    mimeType = blob.type || 'image/jpeg';
  }

  if (!base64) throw new Error('Scan completed but no image data returned');

  return {
    base64,
    mimeType,
    protocol: 'unknown',
    scannerName: 'Scanner',
    durationMs: Date.now() - start,
  };
}

// ─── MAIN EXPORT: Universal scan ─────────────────────────────────────────────
// Auto-detects best available protocol and routes accordingly.
// Priority: TWAIN > eSCL > SANE > error

export async function scan(
  options: ScanOptions = {},
  onProgress: (msg: string) => void = () => {}
): Promise<ScanResult> {

  onProgress('Checking scanner bridge…');
  const bridge = await getBridgeStatus();

  if (!bridge.running) {
    // If bridge not running but we have an IP, try direct eSCL
    if (options.scannerIp) {
      onProgress('Bridge offline — trying direct network scan…');
      return scanViaEscl(options.scannerIp, options, onProgress);
    }
    throw new Error(
      'FlowHub bridge is not running. Start flowhub_bridge.py on this machine to enable scanning.'
    );
  }

  // Bridge is running — pick best protocol

  // 1. TWAIN requested explicitly or TWAIN available + no IP specified
  if (options.twainSource || (bridge.twainAvailable && !options.scannerIp)) {
    try {
      return await scanViaTwain(options, onProgress);
    } catch (e: any) {
      console.warn('[ScanService] TWAIN failed, falling back:', e.message);
      onProgress('TWAIN unavailable — trying network scan…');
      // Fall through to eSCL
    }
  }

  // 2. eSCL — network scanner
  const targetIp = options.scannerIp || bridge.esclScanners[0];
  if (targetIp) {
    return scanViaEscl(targetIp, options, onProgress);
  }

  // 3. Generic bridge scan — let the bridge figure it out
  if (bridge.running) {
    return scanViaBridge(options, onProgress);
  }

  throw new Error('No scanner found. Connect a USB scanner or ensure your network scanner is on.');
}

// ─── Scanner picker — returns what's available for UI display ────────────────

export async function getAvailableScanners(): Promise<ScannerDevice[]> {
  const bridge = await getBridgeStatus();
  const devices: ScannerDevice[] = [];

  if (!bridge.running) {
    return [{
      id: 'no_bridge',
      name: 'FlowHub bridge not running',
      protocol: 'unknown',
      available: false,
    }];
  }

  // TWAIN scanners (USB + network TWAIN)
  bridge.twainScanners.forEach((name, i) => {
    devices.push({
      id: `twain_${i}`,
      name,
      protocol: 'twain',
      twainName: name,
      available: true,
    });
  });

  // eSCL network scanners
  bridge.esclScanners.forEach((ip, i) => {
    devices.push({
      id: `escl_${i}`,
      name: `Network Scanner @ ${ip}`,
      protocol: 'escl',
      ip,
      available: true,
    });
  });

  // SANE
  if (bridge.saneAvailable) {
    devices.push({
      id: 'sane_default',
      name: 'USB Scanner (SANE)',
      protocol: 'sane',
      available: true,
    });
  }

  return devices.length > 0 ? devices : [{
    id: 'no_scanner',
    name: 'No scanners found',
    protocol: 'unknown',
    available: false,
  }];
}

// ─── Saved scanner preferences ───────────────────────────────────────────────

const PREFS_KEY = 'storyscribe_scan_prefs';

export interface ScanPrefs {
  preferredProtocol?: ScanProtocol;
  preferredTwainSource?: string;
  preferredIp?: string;
  resolution: 150 | 300 | 600;
  colorMode: 'color' | 'grayscale' | 'blackwhite';
}

export function getScanPrefs(): ScanPrefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
  } catch {
    return { resolution: 300, colorMode: 'color' };
  }
}

export function saveScanPrefs(prefs: Partial<ScanPrefs>): void {
  const current = getScanPrefs();
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
}
