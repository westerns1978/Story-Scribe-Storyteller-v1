
import React, { useState, useRef, useEffect, DragEvent } from 'react';
import { storageService } from '../services/storageService';
import { extractDocumentDNA, extractTextFromDocument } from '../services/api';
import { fileToBase64 } from '../utils/fileUtils';
import { NeuralAsset } from '../types';
import TrashIcon from './icons/TrashIcon';
import DocumentArrowUpIcon from './icons/DocumentArrowUpIcon';
import ImageIcon from './icons/ImageIcon';
import FilePdfIcon from './icons/FilePdfIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import PlusIcon from './icons/PlusIcon';
import SparklesIcon from './icons/SparklesIcon';
import EyeIcon from './icons/EyeIcon';

interface FileManagerProps {
    onAssetIngested?: (asset: NeuralAsset) => void;
    onUseAsset?: (asset: NeuralAsset) => void;
    onTextExtracted?: (text: string, asset: NeuralAsset) => void;
}

function getFileIcon(mimeType: string) {
    if (mimeType?.startsWith('image/')) return <ImageIcon className="w-10 h-10 text-sky-400" />;
    if (mimeType === 'application/pdf') return <FilePdfIcon className="w-10 h-10 text-rose-400" />;
    return <DocumentTextIcon className="w-10 h-10 text-slate-400" />;
}

function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const FileManager: React.FC<FileManagerProps> = ({ onAssetIngested, onUseAsset, onTextExtracted }) => {
    const [files, setFiles] = useState<NeuralAsset[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadQueue, setUploadQueue] = useState<{ name: string, progress: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadFiles();
    }, []);

    async function loadFiles() {
        setIsLoading(true);
        try {
            const assets = await storageService.loadFiles();
            setFiles(assets);
        } catch (e) {
            console.error("Vault sync failed", e);
        } finally {
            setIsLoading(false);
        }
    }

    async function uploadFiles(filesToUpload: File[]) {
        setUploading(true);
        setUploadQueue(filesToUpload.map(f => ({ name: f.name, progress: 0 })));

        for (let i = 0; i < filesToUpload.length; i++) {
            const file = filesToUpload[i];
            try {
                setUploadQueue(q => q.map((it, idx) => idx === i ? { ...it, progress: 20 } : it));
                
                let dna = {};
                let extractedText = '';
                
                if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                    const base64 = await fileToBase64(file);
                    
                    // Extract DNA (title, summary, tags)
                    setUploadQueue(q => q.map((it, idx) => idx === i ? { ...it, progress: 40 } : it));
                    dna = await extractDocumentDNA(base64, file.type);
                    
                    // Extract full text content for story generation
                    setUploadQueue(q => q.map((it, idx) => idx === i ? { ...it, progress: 60 } : it));
                    extractedText = await extractTextFromDocument(base64, file.type);
                }

                setUploadQueue(q => q.map((it, idx) => idx === i ? { ...it, progress: 80 } : it));
                const asset = await storageService.uploadFile(file, { ...dna, extracted_text: extractedText });
                
                setUploadQueue(q => q.map((it, idx) => idx === i ? { ...it, progress: 100 } : it));
                
                if (onAssetIngested) onAssetIngested(asset);
                if (onTextExtracted && extractedText) onTextExtracted(extractedText, asset);
                
            } catch (error) {
                console.error("Upload failed", file.name, error);
            }
        }

        setTimeout(() => {
            setUploading(false);
            setUploadQueue([]);
            loadFiles();
        }, 1000);
    }

    const handleDelete = async (asset: NeuralAsset) => {
        if (!confirm(`Permanently delete ${asset.file_name}?`)) return;
        try {
            await storageService.deleteFile(asset);
            setFiles(prev => prev.filter(f => f.id !== asset.id));
        } catch (e) {
            alert("Delete failed.");
        }
    };

    return (
        <div className="space-y-8 flex flex-col h-full bg-slate-950 p-6 rounded-3xl border border-slate-800">
            {/* Upload Zone */}
            <div 
                className="border-2 border-dashed border-sky-500/30 rounded-2xl p-10 
                           hover:border-sky-500 hover:bg-sky-500/5 transition-all cursor-pointer bg-slate-900/50"
                onDrop={(e) => { e.preventDefault(); uploadFiles(Array.from(e.dataTransfer.files)); }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
            >
                <input ref={fileInputRef} type="file" multiple onChange={(e) => e.target.files && uploadFiles(Array.from(e.target.files))} className="hidden" />
                <div className="text-center">
                    <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-sky-500 mb-4" />
                    <p className="text-lg font-bold text-slate-100">Neural Archive Ingestion</p>
                    <p className="text-sm text-slate-500 mt-2">Drop historical records, photos, or documents to secure them.</p>
                </div>
            </div>

            {/* Upload Progress */}
            {uploading && (
                <div className="space-y-3">
                    {uploadQueue.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-slate-900 rounded-xl border border-sky-500/20">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                                <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-sky-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${file.progress}%` }} />
                                </div>
                            </div>
                            <span className="text-xs font-mono text-sky-400">{file.progress}%</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 opacity-50">
                        <SparklesIcon className="w-8 h-8 text-sky-500 animate-spin mb-4" />
                        <p className="text-sm font-mono tracking-widest text-slate-400 uppercase">Syncing_Records...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {files.map((file) => (
                            <div key={file.id} className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:ring-2 hover:ring-sky-500 transition-all">
                                <div className="aspect-square relative">
                                    {file.file_type?.startsWith('image/') ? (
                                        <img src={file.public_url} alt={file.file_name} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                            {getFileIcon(file.file_type)}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => onUseAsset?.(file)} className="p-2 bg-sky-500 text-white rounded-full hover:bg-sky-600"><EyeIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(file)} className="p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="text-xs font-bold text-slate-200 truncate">{file.metadata?.title || file.file_name}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-[10px] text-slate-500">{formatFileSize(file.file_size)}</span>
                                        <span className="text-[10px] text-slate-600">{new Date(file.uploaded_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
