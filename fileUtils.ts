// utils/fileUtils.ts
// ─────────────────────────────────────────────────────────────────────────────
// File utilities for Wissums
//
// extractTextFromPdf:
//   1. Load PDF via pdf.js CDN (no build dependency)
//   2. Extract text layer from every page
//   3. If text layer is empty/sparse (scanned doc), fall back to
//      Gemini Vision OCR via story-cascade analyze_document action
//      — so Derek's scanned military records, letters, etc. all get read
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a File or Blob to a base64 data string (no prefix) */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:...;base64," prefix
      resolve(result.split(',')[1] || result);
    };
    reader.onerror = () => reject(new Error('fileToBase64 failed'));
    reader.readAsDataURL(file);
  });
}

/** Convert a File to an ArrayBuffer */
async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// ── pdf.js loader ────────────────────────────────────────────────────────────

let _pdfjs: any = null;

async function loadPdfJs(): Promise<any> {
  if (_pdfjs) return _pdfjs;
  if ((window as any).pdfjsLib) {
    _pdfjs = (window as any).pdfjsLib;
    _pdfjs.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return _pdfjs;
  }

  // Dynamically inject pdf.js from CDN
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load pdf.js'));
    document.head.appendChild(script);
  });

  _pdfjs = (window as any).pdfjsLib;
  _pdfjs.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return _pdfjs;
}

// ── Gemini Vision OCR fallback ───────────────────────────────────────────────

async function ocrPageWithGemini(imageBase64: string, mimeType: string): Promise<string> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/story-cascade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'analyze_document',
        image_base64: imageBase64,
        mime_type: mimeType,
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const analysis = data.analysis || {};
    // Return transcribed text + key facts as a combined content block
    const parts: string[] = [];
    if (analysis.transcribed_text) parts.push(analysis.transcribed_text);
    if (analysis.description) parts.push(`[${analysis.document_type || 'Document'}: ${analysis.description}]`);
    if (analysis.key_facts?.length) parts.push(`Key facts: ${analysis.key_facts.join(', ')}`);
    if (analysis.emotional_significance) parts.push(`Significance: ${analysis.emotional_significance}`);
    return parts.join('\n\n');
  } catch {
    return '';
  }
}

// ── Render a PDF page to a JPEG base64 for OCR ──────────────────────────────

async function renderPageToBase64(page: any): Promise<string> {
  const viewport = page.getViewport({ scale: 2.0 }); // 2x for legibility
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  // Return base64 without prefix
  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Extract text from a PDF file.
 *
 * Strategy:
 * 1. Parse with pdf.js and pull the text layer from every page.
 * 2. If the text layer yields < 50 chars per page on average (scanned/image PDF),
 *    render each page to canvas and send to Gemini Vision OCR instead.
 * 3. Returns a single string with all page content separated by page markers.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await fileToArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    const pageTexts: string[] = [];
    let totalChars = 0;

    // Pass 1: extract text layer
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      pageTexts.push(pageText);
      totalChars += pageText.length;
    }

    const avgCharsPerPage = totalChars / numPages;

    // If text layer is substantial, use it directly
    if (avgCharsPerPage >= 50) {
      return pageTexts
        .map((text, i) => (numPages > 1 ? `[Page ${i + 1}]\n${text}` : text))
        .filter(t => t.trim().length > 0)
        .join('\n\n');
    }

    // Pass 2: scanned PDF — render pages and OCR via Gemini
    console.log('[fileUtils] Sparse text layer detected — using Gemini Vision OCR for', file.name);
    const ocrTexts: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      try {
        const imageBase64 = await renderPageToBase64(page);
        const ocrText = await ocrPageWithGemini(imageBase64, 'image/jpeg');
        ocrTexts.push(ocrText);
      } catch (err) {
        console.warn(`[fileUtils] OCR failed for page ${i}:`, err);
        ocrTexts.push(pageTexts[i - 1] || ''); // fall back to sparse text
      }
    }

    const combined = ocrTexts
      .map((text, i) => (numPages > 1 ? `[Page ${i + 1}]\n${text}` : text))
      .filter(t => t.trim().length > 0)
      .join('\n\n');

    return combined || `[Document: ${file.name} — could not extract text]`;

  } catch (err) {
    console.error('[fileUtils] PDF extraction failed:', err);
    // Last resort: return a placeholder so the story still generates
    return `[Document: ${file.name} — uploaded but text extraction failed. Please describe the contents in conversation with Connie.]`;
  }
}
