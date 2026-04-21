/**
 * DownloadMemoryBook.tsx — Goosebumps Edition
 *
 * Enhanced Memory Book PDF with:
 * - Cover page with hero image + story title
 * - Timeline spread (visual life chronology)
 * - Scene pages with pull quotes + QR codes to watch cinematic reveal
 * - Graceful image fallback (beautiful text page, never black void)
 * - Quotes spread
 * - Life lessons spread
 * - Back cover with QR code to watch the movie
 */

import React, { useState } from 'react';
import { BRAND, isWissums } from '../utils/brandUtils';
import { formatDisplayName } from '../utils/nameUtils';

const TONE_COLORS: Record<string, string> = {
  'ai-decide':   '#C4973B',
  'somber':      '#7B9EA8',
  'warm':        '#E8A24A',
  'bittersweet': '#B07D54',
  'inspiring':   '#8FA86E',
  'funny':       '#D4A843',
  'peaceful':    '#7A9E8A',
};

const PW = 1684;
const PH = 1190;
const STORY_BASE = (process.env as any).APP_URL || 'https://gemynd-wissums-608887102507.us-west1.run.app';

interface Props {
  story: any;
  style?: React.CSSProperties;
}

function hexToRgb(hex: string) {
  return { r: parseInt(hex.slice(1,3),16), g: parseInt(hex.slice(3,5),16), b: parseInt(hex.slice(5,7),16) };
}

// Fetch image as blob → object URL to avoid CORS canvas taint.
// Supabase Storage may not echo back Access-Control-Allow-Origin,
// which silently taints the canvas and causes toDataURL() to return blank.
async function loadImageEl(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  let src = url;
  let objectUrl: string | null = null;
  try {
    // Try fetch-as-blob first (bypasses CORS taint)
    const res = await Promise.race([
      fetch(url, { mode: 'cors', cache: 'force-cache' }),
      new Promise<null>(r => setTimeout(() => r(null), 10000)),
    ]);
    if (res && (res as Response).ok) {
      const blob = await (res as Response).blob();
      objectUrl = URL.createObjectURL(blob);
      src = objectUrl;
    }
  } catch { /* fall through to direct load */ }

  return new Promise(resolve => {
    const img = new Image();
    if (!objectUrl) img.crossOrigin = 'anonymous';
    img.onload = () => { resolve(img); };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = src;
    setTimeout(() => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(null);
    }, 12000);
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = (text || '').split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// ── Generate QR code as canvas data URL using Google Charts API ──────────────
async function getQrDataUrl(url: string, size = 120): Promise<HTMLImageElement | null> {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=13100C&color=C4973B&format=png`;
  return loadImageEl(qrUrl);
}

// ── COVER PAGE ────────────────────────────────────────────────────────────────
async function drawCover(ctx: CanvasRenderingContext2D, tc: string, story: any) {
  const { r, g, b } = hexToRgb(tc);

  ctx.fillStyle = '#13100C';
  ctx.fillRect(0, 0, PW, PH);

  // Try to load first scene image as hero
  const heroImg = story.generatedImages?.find((i: any) => i.image_url);
  const img = heroImg ? await loadImageEl(heroImg.image_url) : null;

  if (img) {
    // Full bleed image, right side
    ctx.save();
    ctx.globalAlpha = 0.35;
    const scale = Math.max(PW / img.naturalWidth, PH / img.naturalHeight);
    const sw = PW / scale, sh = PH / scale;
    const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, PW, PH);
    ctx.restore();

    // Dark gradient overlay for legibility
    const grad = ctx.createLinearGradient(0, 0, PW, 0);
    grad.addColorStop(0, 'rgba(19,16,12,0.97)');
    grad.addColorStop(0.5, 'rgba(19,16,12,0.85)');
    grad.addColorStop(1, 'rgba(19,16,12,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, PW, PH);
  }

  // Ambient glow
  const grd = ctx.createRadialGradient(PW * 0.25, PH * 0.4, 0, PW * 0.25, PH * 0.4, 500);
  grd.addColorStop(0, `rgba(${r},${g},${b},0.15)`);
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, PW, PH);

  // Corner brackets
  ctx.strokeStyle = tc; ctx.lineWidth = 2;
  const m = 64, ll = 100;
  ctx.beginPath();
  ctx.moveTo(m, m+ll); ctx.lineTo(m, m); ctx.lineTo(m+ll, m);
  ctx.moveTo(PW-m, PH-m-ll); ctx.lineTo(PW-m, PH-m); ctx.lineTo(PW-m-ll, PH-m);
  ctx.stroke();

  ctx.textAlign = 'left';
  const TX = 120;

  // Label
  ctx.fillStyle = tc;
  ctx.font = 'bold 22px system-ui';
  ctx.fillText('STORY SCRIBE  ·  MEMORY BOOK', TX, PH * 0.28);

  ctx.strokeStyle = tc; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
  ctx.beginPath(); ctx.moveTo(TX, PH * 0.315); ctx.lineTo(TX + 420, PH * 0.315); ctx.stroke();
  ctx.globalAlpha = 1;

  // Main title
  const name = formatDisplayName(story.storytellerName) || 'A Life';
  const title = story.title || `${name}'s Story`;
  ctx.fillStyle = '#FDF6EC';
  ctx.font = 'bold italic 88px Georgia, serif';
  const titleLines = wrapText(ctx, title, PW * 0.55);
  let y = PH * 0.44;
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, TX, y);
    y += 96;
  }

  // Sub
  ctx.fillStyle = 'rgba(255,248,235,0.45)';
  ctx.font = 'italic 32px Georgia, serif';
  ctx.fillText(`The Life and Memory of ${name}`, TX, y + 12);

  // Opening line if available
  if (story.extraction?.opening_line) {
    y += 72;
    ctx.fillStyle = tc;
    ctx.globalAlpha = 0.7;
    ctx.font = 'italic 26px Georgia, serif';
    const opLines = wrapText(ctx, `"${story.extraction.opening_line}"`, PW * 0.5);
    for (const line of opLines.slice(0, 2)) {
      ctx.fillText(line, TX, y);
      y += 36;
    }
    ctx.globalAlpha = 1;
  }

  // Bottom bar
  ctx.strokeStyle = 'rgba(255,248,235,0.12)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(TX, PH * 0.82); ctx.lineTo(TX + 500, PH * 0.82); ctx.stroke();

  ctx.fillStyle = 'rgba(255,248,235,0.22)';
  ctx.font = '20px system-ui';
  const now = new Date();
  ctx.fillText(`Preserved ${now.toLocaleString('default',{month:'long'})} ${now.getFullYear()}  ·  ${BRAND.name}`, TX, PH * 0.88);
}

// ── TIMELINE SPREAD ───────────────────────────────────────────────────────────
function drawTimeline(ctx: CanvasRenderingContext2D, tc: string, story: any) {
  const { r, g, b } = hexToRgb(tc);
  ctx.fillStyle = '#0F0D0A';
  ctx.fillRect(0, 0, PW, PH);

  const grd = ctx.createRadialGradient(PW/2, PH/2, 0, PW/2, PH/2, 700);
  grd.addColorStop(0, `rgba(${r},${g},${b},0.06)`);
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, PW, PH);

  ctx.textAlign = 'center';
  ctx.fillStyle = tc;
  ctx.font = 'bold 20px system-ui';
  ctx.fillText('LIFE CHRONOLOGY', PW/2, 72);

  ctx.strokeStyle = tc; ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
  ctx.beginPath(); ctx.moveTo(PW/2 - 200, 90); ctx.lineTo(PW/2 + 200, 90); ctx.stroke();
  ctx.globalAlpha = 1;

  const timeline = story.extraction?.timeline || [];
  if (timeline.length === 0) {
    ctx.fillStyle = 'rgba(255,248,235,0.2)';
    ctx.font = 'italic 28px Georgia, serif';
    ctx.fillText('Timeline not available', PW/2, PH/2);
    return;
  }

  // Horizontal timeline line
  const lineY = PH / 2 + 20;
  const lineX1 = 100, lineX2 = PW - 100;
  ctx.strokeStyle = tc; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.3;
  ctx.beginPath(); ctx.moveTo(lineX1, lineY); ctx.lineTo(lineX2, lineY); ctx.stroke();
  ctx.globalAlpha = 1;

  const items = timeline.slice(0, 10);
  const step = (lineX2 - lineX1) / (items.length - 1 || 1);

  items.forEach((event: any, i: number) => {
    const x = lineX1 + i * step;
    const above = i % 2 === 0;
    const textY = above ? lineY - 40 : lineY + 60;
    const dotY = lineY;

    // Dot
    ctx.fillStyle = tc;
    ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(x, dotY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Connector line
    ctx.strokeStyle = tc; ctx.lineWidth = 1; ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(x, dotY + (above ? -8 : 8));
    ctx.lineTo(x, above ? textY + 10 : textY - 40);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Year
    ctx.textAlign = 'center';
    ctx.fillStyle = tc;
    ctx.font = 'bold 22px system-ui';
    ctx.fillText(event.year || '', x, above ? textY - 12 : textY + 26);

    // Event text (truncated)
    ctx.fillStyle = 'rgba(255,248,235,0.55)';
    ctx.font = '17px Georgia, serif';
    const eventText = (event.event || '').substring(0, 40) + ((event.event || '').length > 40 ? '...' : '');
    const words = eventText.split(' ');
    let line1 = '', line2 = '';
    for (const w of words) {
      if (ctx.measureText(line1 + ' ' + w).width < 140) line1 += (line1 ? ' ' : '') + w;
      else line2 += (line2 ? ' ' : '') + w;
    }
    ctx.fillText(line1, x, above ? textY + 8 : textY - 20);
    if (line2) ctx.fillText(line2, x, above ? textY + 28 : textY);
  });
}

// ── SCENE PAGE ────────────────────────────────────────────────────────────────
async function drawScene(
  ctx: CanvasRenderingContext2D,
  tc: string,
  beat: any,
  image: any,
  sceneNum: number,
  total: number,
  shareUrl: string
) {
  const { r, g, b } = hexToRgb(tc);
  const IMG_W = Math.floor(PW * 0.56);
  const TX = IMG_W + 52;
  const TW = PW - IMG_W - 90;

  ctx.fillStyle = '#13100C';
  ctx.fillRect(0, 0, PW, PH);

  // Image or elegant fallback
  const img = await loadImageEl(image?.image_url || '');
  if (img) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, IMG_W, PH); ctx.clip();
    const scale = Math.max(IMG_W / img.naturalWidth, PH / img.naturalHeight);
    const sw = IMG_W / scale, sh = PH / scale;
    const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, IMG_W, PH);
    ctx.restore();

    // Vignette + edge fade
    const vignette = ctx.createRadialGradient(IMG_W/2, PH/2, PH*0.25, IMG_W/2, PH/2, PH*0.85);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, IMG_W, PH);

    const fade = ctx.createLinearGradient(IMG_W - 180, 0, IMG_W + 16, 0);
    fade.addColorStop(0, 'rgba(19,16,12,0)');
    fade.addColorStop(1, 'rgba(19,16,12,0.98)');
    ctx.fillStyle = fade; ctx.fillRect(IMG_W - 180, 0, 200, PH);
  } else {
    // Elegant no-image fallback
    ctx.fillStyle = `rgba(${r},${g},${b},0.04)`;
    ctx.fillRect(0, 0, IMG_W, PH);

    // Decorative pattern
    ctx.strokeStyle = tc; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.08;
    for (let y = 0; y < PH; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(IMG_W, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Scene number large
    ctx.textAlign = 'center';
    ctx.fillStyle = tc; ctx.globalAlpha = 0.08;
    ctx.font = `bold 320px Georgia, serif`;
    ctx.fillText(String(sceneNum), IMG_W/2, PH/2 + 120);
    ctx.globalAlpha = 1;

    const fade = ctx.createLinearGradient(IMG_W - 180, 0, IMG_W + 16, 0);
    fade.addColorStop(0, `rgba(19,16,12,0)`);
    fade.addColorStop(1, 'rgba(19,16,12,0.98)');
    ctx.fillStyle = fade; ctx.fillRect(IMG_W - 180, 0, 200, PH);
  }

  // Accent line
  ctx.strokeStyle = tc; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.4;
  ctx.beginPath(); ctx.moveTo(IMG_W + 14, PH * 0.1); ctx.lineTo(IMG_W + 14, PH * 0.9); ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.textAlign = 'left';
  let y = 108;

  // Scene label
  ctx.fillStyle = tc; ctx.font = 'bold 20px system-ui';
  ctx.fillText(`SCENE  ${String(sceneNum).padStart(2,'0')} / ${String(total).padStart(2,'0')}`, TX, y);
  y += 58;

  // Beat title
  ctx.fillStyle = '#FDF6EC'; ctx.font = 'bold italic 50px Georgia, serif';
  const titleLines = wrapText(ctx, beat.beat_title || `Scene ${sceneNum}`, TW);
  for (const tl of titleLines.slice(0, 2)) { ctx.fillText(tl, TX, y); y += 58; }
  y += 10;

  ctx.strokeStyle = tc; ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
  ctx.beginPath(); ctx.moveTo(TX, y); ctx.lineTo(TX + TW, y); ctx.stroke();
  ctx.globalAlpha = 1;
  y += 40;

  // Pull quote if available
  const pullQuote = beat.pull_quote || '';
  if (pullQuote) {
    ctx.fillStyle = tc; ctx.font = 'bold italic 68px Georgia, serif'; ctx.globalAlpha = 0.6;
    ctx.fillText('\u201c', TX - 4, y + 6);
    ctx.globalAlpha = 1;
    y += 18;
    ctx.fillStyle = tc; ctx.font = 'italic 28px Georgia, serif'; ctx.globalAlpha = 0.85;
    const pqLines = wrapText(ctx, pullQuote, TW);
    for (const line of pqLines.slice(0, 2)) { ctx.fillText(line, TX, y); y += 38; }
    ctx.globalAlpha = 1;
    y += 20;

    ctx.strokeStyle = tc; ctx.lineWidth = 1; ctx.globalAlpha = 0.2;
    ctx.beginPath(); ctx.moveTo(TX, y); ctx.lineTo(TX + TW * 0.6, y); ctx.stroke();
    ctx.globalAlpha = 1;
    y += 28;
  } else {
    ctx.fillStyle = tc; ctx.font = 'bold italic 80px Georgia, serif'; ctx.globalAlpha = 0.55;
    ctx.fillText('\u201c', TX - 4, y + 8);
    ctx.globalAlpha = 1;
    y += 22;
  }

  // Narrative
  ctx.fillStyle = 'rgba(255,248,235,0.68)'; ctx.font = 'italic 26px Georgia, serif';
  const lines = wrapText(ctx, beat.narrative_chunk || '', TW);
  for (const line of lines) {
    if (y > PH - 150) break;
    ctx.fillText(line, TX, y); y += 40;
  }

  if (y < PH - 90) {
    ctx.fillStyle = tc; ctx.font = 'bold italic 60px Georgia, serif'; ctx.globalAlpha = 0.45;
    ctx.fillText('\u201d', TX, y + 16);
    ctx.globalAlpha = 1;
  }

  // QR code — scan to watch the movie
  const qrImg = await getQrDataUrl(shareUrl, 100);
  if (qrImg) {
    const qrSize = 90;
    const qrX = PW - 52 - qrSize;
    const qrY = PH - 52 - qrSize;

    ctx.fillStyle = 'rgba(19,16,12,0.85)';
    ctx.fillRect(qrX - 8, qrY - 24, qrSize + 16, qrSize + 30);

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    ctx.fillStyle = tc; ctx.globalAlpha = 0.6;
    ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('WATCH', qrX + qrSize/2, qrY - 8);
    ctx.globalAlpha = 1;
  }

  // Page number
  ctx.fillStyle = 'rgba(255,248,235,0.18)'; ctx.font = '20px system-ui'; ctx.textAlign = 'right';
  ctx.fillText(String(sceneNum + 2), PW - 52, PH - 38);
}

// ── QUOTES SPREAD ─────────────────────────────────────────────────────────────
function drawQuotes(ctx: CanvasRenderingContext2D, tc: string, story: any) {
  const { r, g, b } = hexToRgb(tc);
  ctx.fillStyle = '#0F0D0A';
  ctx.fillRect(0, 0, PW, PH);

  const quotes = story.extraction?.key_quotes || [];
  if (quotes.length === 0) return false;

  const grd = ctx.createRadialGradient(PW/2, PH/2, 0, PW/2, PH/2, 600);
  grd.addColorStop(0, `rgba(${r},${g},${b},0.08)`);
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, PW, PH);

  ctx.textAlign = 'center';
  ctx.fillStyle = tc; ctx.font = 'bold 18px system-ui';
  ctx.fillText('IN THEIR OWN WORDS', PW/2, 72);

  const Q = quotes.slice(0, 3);
  const sectionH = (PH - 120) / Q.length;

  Q.forEach((quote: string, i: number) => {
    const clean = quote.replace(/^["""]+|["""]+$/g, '').trim();
    const centerY = 130 + i * sectionH + sectionH / 2;

    ctx.fillStyle = tc; ctx.globalAlpha = 0.2;
    ctx.font = `bold italic 100px Georgia, serif`;
    ctx.fillText('\u201c', PW/2 - 20, centerY + 30);
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,248,235,0.75)';
    ctx.font = `italic ${Math.min(42, Math.max(28, 900 / clean.length))}px Georgia, serif`;
    const lines = wrapText(ctx, clean, PW * 0.7);
    let qy = centerY - (lines.length * 46) / 2;
    for (const line of lines) { ctx.fillText(line, PW/2, qy); qy += 46; }

    if (i < Q.length - 1) {
      ctx.strokeStyle = tc; ctx.lineWidth = 1; ctx.globalAlpha = 0.15;
      ctx.beginPath(); ctx.moveTo(PW/2 - 160, centerY + sectionH/2 - 10); ctx.lineTo(PW/2 + 160, centerY + sectionH/2 - 10); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });

  return true;
}

// ── LIFE LESSONS SPREAD ───────────────────────────────────────────────────────
function drawLifeLessons(ctx: CanvasRenderingContext2D, tc: string, story: any) {
  const { r, g, b } = hexToRgb(tc);
  ctx.fillStyle = '#0F0D0A';
  ctx.fillRect(0, 0, PW, PH);

  const lessons = story.extraction?.life_lessons || [];
  if (lessons.length === 0) return false;

  const grd = ctx.createRadialGradient(PW*0.15, PH/2, 0, PW*0.15, PH/2, 500);
  grd.addColorStop(0, `rgba(${r},${g},${b},0.1)`);
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, PW, PH);

  ctx.textAlign = 'left';
  const TX = 120;

  ctx.fillStyle = tc; ctx.font = 'bold 18px system-ui';
  ctx.fillText('WHAT THEY TAUGHT US', TX, 72);

  ctx.strokeStyle = tc; ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
  ctx.beginPath(); ctx.moveTo(TX, 90); ctx.lineTo(TX + 300, 90); ctx.stroke();
  ctx.globalAlpha = 1;

  const L = lessons.slice(0, 6);
  const cols = L.length > 3 ? 2 : 1;
  const colW = (PW - TX * 2 - 80) / cols;
  const colH = (PH - 130) / Math.ceil(L.length / cols);

  L.forEach((lesson: string, i: number) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = TX + col * (colW + 80);
    const y = 130 + row * colH;

    ctx.fillStyle = tc; ctx.globalAlpha = 0.5;
    ctx.font = 'bold 48px Georgia, serif';
    ctx.fillText(String(i + 1), x, y + 42);
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,248,235,0.65)';
    ctx.font = 'italic 26px Georgia, serif';
    const lLines = wrapText(ctx, lesson, colW - 70);
    let ly = y + 8;
    for (const line of lLines.slice(0, 3)) { ctx.fillText(line, x + 64, ly); ly += 38; }
  });

  return true;
}

// ── BACK COVER ────────────────────────────────────────────────────────────────
async function drawBackCover(ctx: CanvasRenderingContext2D, tc: string, story: any, shareUrl: string) {
  const { r, g, b } = hexToRgb(tc);
  ctx.fillStyle = '#13100C';
  ctx.fillRect(0, 0, PW, PH);

  const grd = ctx.createRadialGradient(PW/2, PH/2, 0, PW/2, PH/2, 520);
  grd.addColorStop(0, `rgba(${r},${g},${b},0.1)`);
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, PW, PH);

  ctx.textAlign = 'center';

  // Closing sentiment
  ctx.fillStyle = 'rgba(255,248,235,0.3)';
  ctx.font = 'italic 30px Georgia, serif';
  ctx.fillText('In memory and celebration of', PW/2, PH/2 - 80);

  ctx.fillStyle = '#FDF6EC';
  ctx.font = 'bold italic 80px Georgia, serif';
  ctx.fillText(formatDisplayName(story.storytellerName) || 'A Life', PW/2, PH/2);

  // Closing line — cap source at 300 chars (word-boundary ellipsis), wrap up
  // to 5 lines. If the wrapped output still overflows, append "…" to the last
  // visible line so the sentence never truncates mid-word on the back cover.
  let dividerY = PH/2 + 44;
  if (story.extraction?.closing_line) {
    const MAX_CHARS = 300;
    const MAX_LINES = 5;
    let closing = String(story.extraction.closing_line).trim();
    if (closing.length > MAX_CHARS) {
      const cut = closing.slice(0, MAX_CHARS);
      const lastSpace = cut.lastIndexOf(' ');
      closing = (lastSpace > MAX_CHARS * 0.7 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\s]+$/, '') + '…';
    }
    ctx.fillStyle = tc; ctx.globalAlpha = 0.65;
    ctx.font = 'italic 24px Georgia, serif';
    const clLines = wrapText(ctx, `"${closing}"`, PW * 0.6);
    const visible = clLines.slice(0, MAX_LINES);
    // If wrapText produced more lines than we can show, append ellipsis to the last visible line
    if (clLines.length > MAX_LINES && visible.length > 0) {
      visible[visible.length - 1] = visible[visible.length - 1].replace(/[,;:\s]+$/, '') + '…';
    }
    const LINE_H = 32;
    let cly = PH/2 + 48;
    for (const line of visible) { ctx.fillText(line, PW/2, cly); cly += LINE_H; }
    ctx.globalAlpha = 1;
    dividerY = PH/2 + 48 + visible.length * LINE_H + 14;
  }

  ctx.strokeStyle = tc; ctx.lineWidth = 1; ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.moveTo(PW/2 - 200, dividerY); ctx.lineTo(PW/2 + 200, dividerY); ctx.stroke();
  ctx.globalAlpha = 1;

  // QR code — scan to watch
  const qrImg = await getQrDataUrl(shareUrl, 160);
  if (qrImg) {
    const qrSize = 140;
    const qrX = PW/2 - qrSize/2;
    const qrY = PH * 0.7;
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    ctx.fillStyle = tc; ctx.globalAlpha = 0.7;
    ctx.font = 'bold 14px system-ui';
    ctx.fillText('SCAN TO WATCH THE CINEMATIC STORY', PW/2, qrY - 12);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(255,248,235,0.2)';
  ctx.font = '18px system-ui';
  ctx.fillText(`This memory book was crafted by ${BRAND.agentName}, your AI memory keeper`, PW/2, PH - 60);
  ctx.fillText(`${BRAND.name}  ·  ${isWissums ? 'wissums.web.app' : 'storyscribe.app'}`, PW/2, PH - 36);
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export function DownloadMemoryBook({ story, style }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState('');

  const tc = TONE_COLORS[story?.storyTone || 'ai-decide'] || '#C4973B';
  const shareUrl = story?.share_url || `${STORY_BASE}?story=${story?.sessionId || ''}`;

  async function handleDownload() {
    if (state === 'loading') return;
    setState('loading');
    setProgress('Preparing your memory book...');

    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const PW_PT = pdf.internal.pageSize.getWidth();
      const PH_PT = pdf.internal.pageSize.getHeight();

      const addPage = (cvs: HTMLCanvasElement, first = false) => {
        if (!first) pdf.addPage();
        pdf.addImage(cvs.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, PW_PT, PH_PT);
      };

      const mkCanvas = () => { const c = document.createElement('canvas'); c.width = PW; c.height = PH; return c; };

      // 1. Cover
      setProgress('Building cover...');
      const coverCvs = mkCanvas();
      await drawCover(coverCvs.getContext('2d')!, tc, story);
      addPage(coverCvs, true);

      // 2. Timeline
      setProgress('Building timeline...');
      const timelineCvs = mkCanvas();
      drawTimeline(timelineCvs.getContext('2d')!, tc, story);
      addPage(timelineCvs);

      // 3. Scene pages
      const beats = story?.storyboard?.story_beats || [];
      const imgs = story?.generatedImages || [];
      // Build imgMap supporting all index field names the cascade may return:
      // img.index, img.beat_index, img.beat_number, img.scene_index, or array position
      const imgMap: Record<number, any> = {};
      imgs.forEach((img: any, i: number) => {
        const idx = img.index ?? img.beat_index ?? img.beat_number ?? img.scene_index ?? i;
        imgMap[idx] = img;
      });

      for (let i = 0; i < beats.length; i++) {
        setProgress(`Scene ${i + 1} of ${beats.length}...`);
        const cvs = mkCanvas();
        await drawScene(cvs.getContext('2d')!, tc, beats[i], imgMap[i] || {}, i + 1, beats.length, shareUrl);
        addPage(cvs);
      }

      // 4. Quotes spread
      if ((story.extraction?.key_quotes || []).length > 0) {
        setProgress('Building quotes...');
        const qCvs = mkCanvas();
        drawQuotes(qCvs.getContext('2d')!, tc, story);
        addPage(qCvs);
      }

      // 5. Life lessons
      if ((story.extraction?.life_lessons || []).length > 0) {
        setProgress('Building life lessons...');
        const lCvs = mkCanvas();
        drawLifeLessons(lCvs.getContext('2d')!, tc, story);
        addPage(lCvs);
      }

      // 6. Back cover
      setProgress('Finishing...');
      const backCvs = mkCanvas();
      await drawBackCover(backCvs.getContext('2d')!, tc, story, shareUrl);
      addPage(backCvs);

      const filename = `${(formatDisplayName(story?.storytellerName) || 'Story').replace(/\s+/g,'_')}_Memory_Book.pdf`;
      pdf.save(filename);
      setState('done');
      setTimeout(() => setState('idle'), 3000);

    } catch (err: any) {
      console.error('PDF error:', err);
      setState('error');
      setProgress(err.message || 'Export failed');
      setTimeout(() => setState('idle'), 5000);
    }
  }

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '13px 26px', borderRadius: 24,
    border: `1px solid ${state === 'done' ? 'rgba(74,222,128,0.4)' : tc + '50'}`,
    background: state === 'done' ? 'rgba(74,222,128,0.1)' : `${tc}15`,
    color: state === 'done' ? '#4ade80' : tc,
    fontSize: 12, fontFamily: 'system-ui', fontWeight: 700,
    letterSpacing: '0.25em', textTransform: 'uppercase' as const,
    cursor: state === 'loading' ? 'wait' : 'pointer',
    opacity: state === 'loading' ? 0.7 : 1,
    transition: 'all 0.3s',
    ...style,
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6 }}>
      <button onClick={handleDownload} disabled={state === 'loading'} style={btnStyle}>
        {state === 'loading' ? (
          <svg style={{ animation: 'mbspin 1s linear infinite' }} width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="8" cy="8" r="6" strokeDasharray="22 14" strokeLinecap="round"/>
          </svg>
        ) : state === 'done' ? (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3,8 7,12 13,4"/></svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="1" width="9" height="12" rx="1.5"/>
            <line x1="4.5" y1="4.5" x2="8.5" y2="4.5"/><line x1="4.5" y1="7" x2="8.5" y2="7"/>
            <line x1="4.5" y1="9.5" x2="7" y2="9.5"/>
            <polyline points="10,8.5 13.5,8.5 13.5,14.5 10,14.5"/>
            <line x1="13.5" y1="11.5" x2="10" y2="11.5"/>
          </svg>
        )}
        {state === 'loading' ? (progress || 'Building...')
          : state === 'done' ? 'Downloaded!'
          : state === 'error' ? 'Try again'
          : 'Download Memory Book  ·  PDF'}
      </button>
      {state === 'error' && progress && (
        <div style={{ fontSize: 10, color: 'rgba(248,113,113,0.7)', fontFamily: 'system-ui', paddingLeft: 4 }}>{progress}</div>
      )}
      <style>{`@keyframes mbspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
