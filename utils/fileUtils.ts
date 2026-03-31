import * as pdfjsLib from 'pdfjs-dist';

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';

// Fix for worker location in a browser environment
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';
}

export const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });

// Try client-side extraction first, then fall back to server-side via Supabase edge function
export const extractTextFromPdf = async (file: File): Promise<string> => {
    // 1. Try client-side with pdfjs
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n\n';
        }
        const trimmed = fullText.trim();
        if (trimmed.length > 20) return trimmed; // success
    } catch (e) {
        console.warn('[fileUtils] Client-side PDF extraction failed, trying server-side:', e);
    }

    // 2. Fall back to server-side via story-cascade edge function
    try {
        const base64 = await fileToBase64(file);
        const res = await fetch(`${SUPABASE_URL}/functions/v1/story-cascade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
                action: 'extract_pdf_text',
                pdf_base64: base64,
                mime_type: 'application/pdf',
            }),
        });
        if (res.ok) {
            const data = await res.json();
            const text = data.text || data.extracted_text || '';
            if (text.length > 20) return text;
        }
    } catch (e) {
        console.warn('[fileUtils] Server-side PDF extraction also failed:', e);
    }

    // 3. Both failed — return empty string, NEVER an error message that poisons the cascade
    console.error('[fileUtils] PDF extraction failed completely for:', file.name);
    return '';
};

export const prepareArtifactForAi = async (file: File) => {
    const base64 = await fileToBase64(file);
    let text = '';

    if (file.type === 'application/pdf') {
        text = await extractTextFromPdf(file);
    }

    return {
        name: file.name,
        mimeType: file.type,
        data: base64,
        extractedText: text
    };
};
