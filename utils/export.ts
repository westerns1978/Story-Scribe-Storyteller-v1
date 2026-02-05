import { ExtractionResponse } from '../types';

declare var XLSX: any;

interface FlatExtraction {
    document_name: string;
    field_name: string;
    extracted_value: string;
    confidence: number;
    review_status: 'needs_review' | 'verified';
    source_text: string;
}

// FIX: Define a more accurate type for items being exported.
// This matches the object shape created in App.tsx's handleExport function.
interface ExportableItem {
    name: string;
    result?: ExtractionResponse;
}

const flattenResults = (items: ExportableItem[]): FlatExtraction[] => {
    const flatData: FlatExtraction[] = [];
    items.forEach(item => {
        // FIX: The 'status' property does not exist. The check for 'result' is sufficient.
        if (item.result?.extractions) {
            item.result.extractions.forEach(ext => {
                flatData.push({
                    document_name: item.name,
                    field_name: ext.field_name,
                    // FIX: Ensure the extracted value is always a string to match the FlatExtraction type.
                    extracted_value: String(ext.extracted_value),
                    confidence: ext.confidence,
                    review_status: ext.review_status,
                    source_text: ext.source_span,
                });
            });
        }
    });
    return flatData;
};

const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToCsv = (items: ExportableItem[], filename: string) => {
    const flatData = flattenResults(items);
    if (flatData.length === 0) return;

    const headers = Object.keys(flatData[0]).join(',');
    const rows = flatData.map(row => 
        Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
};


export const exportToXlsx = (items: ExportableItem[], filename: string) => {
    const flatData = flattenResults(items);
    if (flatData.length === 0) return;
    
    // Check if XLSX library is loaded
    if(typeof XLSX === 'undefined') {
        console.error("XLSX library is not loaded. Cannot export to Excel.");
        alert("Excel export functionality is not available. Please check the console.");
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Extractions");
    
    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Create a Blob from the buffer
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
};