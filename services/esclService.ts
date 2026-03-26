// services/esclService.ts
// ============================================
// eSCL driverless scanner integration for Story Scribe
// eSCL is HTTP-based, built into every modern Epson, Ricoh, Fujitsu,
// Canon, Brother network scanner. Zero driver install required.
//
// Two modes:
//   DIRECT: browser → scanner IP directly (same network, CORS permitting)
//   BRIDGE: browser → FlowHub localhost:8585/escl/{ip}/... → scanner
//           Use bridge when CORS blocks direct access (most cases)
// ============================================

export interface ScannerInfo {
  ip: string;
  name: string;
  manufacturer: string;
  model: string;
  status: 'idle' | 'scanning' | 'error' | 'unknown';
  maxWidth: number;   // pixels at 300dpi
  maxHeight: number;
  colorModes: string[];
  resolutions: number[];
}

export interface EsclScanOptions {
  resolution?: 300 | 600;
  colorMode?: 'RGB24' | 'Grayscale8' | 'BlackAndWhite1';
  intent?: 'Photo' | 'Document' | 'TextAndGraphic';
  format?: 'image/jpeg' | 'application/pdf';
}

// ─── Config ──────────────────────────────────────────────────────────────────

const BRIDGE_BASE = (() => {
  try { return `https://${JSON.parse(localStorage.getItem('storyscribe_scan_prefs') || '{}').preferredIp || '192.168.1.169'}:8585`; }
  catch { return 'https://192.168.1.169:8585'; }
})();
const BRIDGE_TIMEOUT = 30000; // 30s for scan operations
const POLL_INTERVAL = 1500;   // poll every 1.5s
const POLL_MAX = 20;          // give up after 30s

// ─── Helpers ─────────────────────────────────────────────────────────────────

function bridgeUrl(ip: string, path: string): string {
  // Route through FlowHub bridge to avoid CORS and handle HTTP scanners
  // bridge endpoint: /escl/{ip}/{path}
  const cleanIp = ip.trim().replace(/^https?:\/\//, '');
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${BRIDGE_BASE}/escl/${cleanIp}/${cleanPath}`;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function parseXmlText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<[^/]*${tag}[^>]*>([^<]*)<`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function parseXmlAll(xml: string, tag: string): string[] {
  const matches = [...xml.matchAll(new RegExp(`<[^/]*${tag}[^>]*>([^<]*)<`, 'gi'))];
  return matches.map(m => m[1].trim()).filter(Boolean);
}

// ─── Check if FlowHub bridge is running ──────────────────────────────────────

export async function isBridgeRunning(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${BRIDGE_BASE}/health`, {}, 2000);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Get scanner capabilities ─────────────────────────────────────────────────

export async function getScannerInfo(ip: string): Promise<ScannerInfo> {
  const url = bridgeUrl(ip, 'eSCL/ScannerCapabilities');
  const res = await fetchWithTimeout(url, {}, 8000);

  if (!res.ok) throw new Error(`Scanner not responding at ${ip} (${res.status})`);

  const xml = await res.text();

  // Parse resolutions
  const resStrings = parseXmlAll(xml, 'XResolution').concat(parseXmlAll(xml, 'DiscreteResolution'));
  const resolutions = [...new Set(
    resStrings.map(r => parseInt(r)).filter(r => !isNaN(r) && r > 0)
  )].sort((a, b) => a - b);

  return {
    ip,
    name: parseXmlText(xml, 'Name') || parseXmlText(xml, 'MakeAndModel') || `Scanner @ ${ip}`,
    manufacturer: parseXmlText(xml, 'Manufacturer') || 'Unknown',
    model: parseXmlText(xml, 'MakeAndModel') || parseXmlText(xml, 'Model') || 'Unknown',
    status: 'idle',
    maxWidth: parseInt(parseXmlText(xml, 'MaxWidth') || '2550'),
    maxHeight: parseInt(parseXmlText(xml, 'MaxHeight') || '3300'),
    colorModes: parseXmlAll(xml, 'ColorMode').length > 0
      ? parseXmlAll(xml, 'ColorMode')
      : ['RGB24', 'Grayscale8'],
    resolutions: resolutions.length > 0 ? resolutions : [300, 600],
  };
}

// ─── Get scanner status ───────────────────────────────────────────────────────

export async function getScannerStatus(ip: string): Promise<'idle' | 'scanning' | 'error' | 'unknown'> {
  try {
    const url = bridgeUrl(ip, 'eSCL/ScannerStatus');
    const res = await fetchWithTimeout(url, {}, 4000);
    if (!res.ok) return 'error';
    const xml = await res.text();
    const state = parseXmlText(xml, 'State').toLowerCase();
    if (state.includes('idle')) return 'idle';
    if (state.includes('process') || state.includes('scan')) return 'scanning';
    if (state.includes('error') || state.includes('jammed')) return 'error';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

// ─── Start a scan job ─────────────────────────────────────────────────────────

async function startScanJob(ip: string, options: EsclScanOptions): Promise<string> {
  const resolution = options.resolution ?? 300;
  const colorMode = options.colorMode ?? 'RGB24';
  const intent = options.intent ?? 'Photo';
  const format = options.format ?? 'image/jpeg';

  const scanRequest = `<?xml version="1.0" encoding="UTF-8"?>
<scan:ScanSettings xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03"
                   xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <pwg:Version>2.63</pwg:Version>
  <scan:Intent>${intent}</scan:Intent>
  <pwg:ScanRegions>
    <pwg:ScanRegion>
      <pwg:ContentRegionUnits>escl:ThreeHundredthsOfInches</pwg:ContentRegionUnits>
      <pwg:Height>4200</pwg:Height>
      <pwg:Width>3300</pwg:Width>
      <pwg:XOffset>0</pwg:XOffset>
      <pwg:YOffset>0</pwg:YOffset>
    </pwg:ScanRegion>
  </pwg:ScanRegions>
  <pwg:InputSource>Platen</pwg:InputSource>
  <scan:ColorMode>${colorMode}</scan:ColorMode>
  <scan:XResolution>${resolution}</scan:XResolution>
  <scan:YResolution>${resolution}</scan:YResolution>
  <pwg:DocumentFormat>${format}</pwg:DocumentFormat>
</scan:ScanSettings>`;

  const url = bridgeUrl(ip, 'eSCL/ScanJobs');
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=UTF-8' },
    body: scanRequest,
  }, BRIDGE_TIMEOUT);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Scan job failed: ${res.status} — ${body.slice(0, 200)}`);
  }

  // Scanner returns job URL in Location header or body
  const location = res.headers.get('Location') || await res.text();
  if (!location) throw new Error('Scanner did not return a job ID');

  // Extract just the job ID path segment
  const jobPath = location.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '');
  return jobPath; // e.g. /eSCL/ScanJobs/1
}

// ─── Poll for completed scan ──────────────────────────────────────────────────

async function pollForResult(
  ip: string,
  jobPath: string,
  onProgress: (msg: string) => void
): Promise<Blob> {
  const docUrl = bridgeUrl(ip, `${jobPath.replace(/^\//, '')}/NextDocument`);

  for (let attempt = 0; attempt < POLL_MAX; attempt++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
    onProgress(`Scanning… (${Math.round((attempt / POLL_MAX) * 100)}%)`);

    try {
      const res = await fetchWithTimeout(docUrl, {}, BRIDGE_TIMEOUT);

      if (res.status === 200) {
        const blob = await res.blob();
        if (blob.size > 1000) return blob; // valid image
      }

      if (res.status === 404) continue; // not ready yet
      if (res.status === 410) throw new Error('Scan job expired — please try again');

    } catch (e: any) {
      if (e.name === 'AbortError') continue;
      if (attempt > 5) throw e;
    }
  }

  throw new Error('Scanner timed out — make sure document is placed on the glass');
}

// ─── Blob → base64 ───────────────────────────────────────────────────────────

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip data:image/jpeg;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Main export: scan one page ──────────────────────────────────────────────

export async function scanPage(
  ip: string,
  options: EsclScanOptions = {},
  onProgress: (msg: string) => void = () => {}
): Promise<{ base64: string; mimeType: string; blob: Blob }> {
  onProgress('Connecting to scanner…');

  const status = await getScannerStatus(ip);
  if (status === 'scanning') throw new Error('Scanner is busy — please wait and try again');
  if (status === 'error') throw new Error('Scanner is in an error state — check the device');

  onProgress('Starting scan job…');
  const jobPath = await startScanJob(ip, options);

  onProgress('Scanning…');
  const blob = await pollForResult(ip, jobPath, onProgress);

  onProgress('Processing image…');
  const base64 = await blobToBase64(blob);

  return { base64, mimeType: blob.type || 'image/jpeg', blob };
}

// ─── Saved scanner IPs (localStorage) ────────────────────────────────────────

const STORAGE_KEY = 'storyscribe_scanner_ips';

export function getSavedScannerIps(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveScannerIp(ip: string): void {
  const existing = getSavedScannerIps();
  const updated = [ip, ...existing.filter(i => i !== ip)].slice(0, 5);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function removeScannerIp(ip: string): void {
  const updated = getSavedScannerIps().filter(i => i !== ip);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
