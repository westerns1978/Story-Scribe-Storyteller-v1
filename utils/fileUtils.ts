import * as pdfjsLib from 'pdfjs-dist';

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

export const extractTextFromPdf = async (file: File): Promise<string> => {
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
        return fullText.trim();
    } catch (e) {
        console.error("PDF_EXTRACTION_FAILURE:", e);
        return "Error extracting text from historical record.";
    }
};

export const prepareArtifactForAi = async (file: File) => {
    const base64 = await fileToBase64(file);
    let text = '';
    
    // Auto-detect PDF and extract text
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