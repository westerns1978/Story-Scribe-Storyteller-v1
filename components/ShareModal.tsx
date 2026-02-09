import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JSZip from 'jszip';
import { ActiveStory, StoryArchiveItem } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import ShareIcon from './icons/ShareIcon';
import ImageIcon from './icons/ImageIcon';
import FilePdfIcon from './icons/FilePdfIcon';
import { exportStoryToPdf, generatePages } from '../utils/storybookUtils';
import Loader2Icon from './icons/Loader2Icon';
import PrinterIcon from './icons/PrintIcon';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    story: StoryArchiveItem | ActiveStory | null;
    showToast?: (msg: string, type: 'success' | 'error' | 'warn') => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, story, showToast }) => {
    const [isExportingImages, setIsExportingImages] = useState(false);
    const [copyStatus, setCopyStatus] = useState('Copy Private Link');

    const storyUrl = useMemo(() => {
        if (!story?.sessionId) return '';
        return `${window.location.origin}?story=${story.sessionId}`;
    }, [story?.sessionId]);

    const storyTitle = useMemo(() => story?.storytellerName || 'Legacy Story', [story?.storytellerName]);

    if (!isOpen || !story) return null;

    const handlePrintTag = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Gemynd Archive Tag</title>
                    <style>
                        body { font-family: 'Playfair Display', serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f9f7f2; }
                        .tag { width: 300px; padding: 40px; border: 2px solid #962D2D; border-radius: 20px; text-align: center; background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                        .logo { width: 60px; margin-bottom: 20px; }
                        h1 { margin: 10px 0; font-size: 24px; color: #1a1715; }
                        p { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #962D2D; font-weight: 900; margin-bottom: 30px; }
                        .qr-wrap { padding: 15px; background: #f9f7f2; border-radius: 15px; display: inline-block; }
                        footer { margin-top: 30px; font-size: 8px; opacity: 0.3; text-transform: uppercase; }
                    </style>
                </head>
                <body>
                    <div class="tag">
                        <img src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" class="logo" />
                        <h1>${storyTitle}</h1>
                        <p>Lexington Archive Node</p>
                        <div class="qr-wrap" id="qr"></div>
                        <footer>Scan to materialise legacy</footer>
                    </div>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
                    <script>
                        new QRCode(document.getElementById("qr"), {
                            text: "${storyUrl}",
                            width: 128,
                            height: 128,
                            colorDark : "#1a1715",
                            colorLight : "#f9f7f2",
                            correctLevel : QRCode.CorrectLevel.H
                        });
                        setTimeout(() => window.print(), 500);
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleCopyLink = () => {
        if (!storyUrl) return;
        navigator.clipboard.writeText(storyUrl).then(() => {
            setCopyStatus('Copied to Clipboard!');
            if (showToast) showToast("Link secured.", "success");
            setTimeout(() => setCopyStatus('Copy Private Link'), 2000);
        });
    };

    const handleDownloadPdf = async () => {
        if (!story || !story.narrative) return;
        const pages = generatePages(story as StoryArchiveItem);
        await exportStoryToPdf(pages, storyTitle);
    };

    const handleDownloadImages = async () => {
        const validImages = (story.generatedImages || []).filter(img => img && img.image_url && img.success);
        if (validImages.length === 0) return;

        setIsExportingImages(true);
        try {
            const zip = new JSZip();
            const folder = zip.folder(`${storyTitle.replace(/\s+/g, '_')}_Artifacts`);
            
            for (let i = 0; i < validImages.length; i++) {
                const img = validImages[i];
                const response = await fetch(img.image_url!);
                const blob = await response.blob();
                folder?.file(`artifact_${i + 1}.png`, blob);
            }

            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `${storyTitle.replace(/\s+/g, '_')}_Vault.zip`;
            link.click();
        } finally {
            setIsExportingImages(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[500] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="w-full max-w-2xl bg-[#0d0b0a] border border-white/10 rounded-[4rem] p-8 lg:p-14 shadow-[0_50px_100px_rgba(0,0,0,1)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-gemynd-oxblood/20 rounded-2xl border border-gemynd-oxblood/30 text-gemynd-red shadow-lg">
                            <ShareIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-display font-black text-white tracking-tighter leading-none">Share Legacy</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.5em] mt-2">Secure Artifact Distribution</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/30 transition-all transform active:scale-95 haptic-tap"><XMarkIcon className="w-7 h-7" /></button>
                </header>

                <main className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center bg-white/[0.03] p-10 rounded-[3.5rem] border border-white/5 shadow-inner">
                        <div className="flex flex-col items-center gap-6">
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-transform hover:scale-105 duration-500">
                                <QRCodeSVG value={storyUrl} size={150} />
                            </div>
                            <button 
                                onClick={handlePrintTag}
                                className="flex items-center gap-3 text-[10px] font-black text-gemynd-agedGold uppercase tracking-widest hover:text-white transition-all haptic-tap"
                            >
                                <PrinterIcon className="w-4 h-4" /> Print Archive Tag
                            </button>
                        </div>
                        
                        <div className="space-y-8">
                            <div className="p-5 bg-black/60 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                                <label className="text-[9px] font-black text-amber-500/40 uppercase tracking-[0.4em] ml-1 block">Vault Entry URL</label>
                                <div className="text-xs font-mono text-slate-400 truncate opacity-80 px-1 border-l border-amber-500/20">{storyUrl}</div>
                            </div>
                            <button 
                                onClick={handleCopyLink} 
                                className="w-full py-6 bg-white text-black font-black rounded-full transition-all text-xs uppercase tracking-[0.4em] shadow-2xl haptic-tap active:scale-95"
                            >
                                {copyStatus}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={handleDownloadPdf} className="py-7 bg-gemynd-oxblood hover:bg-gemynd-red text-white font-black rounded-3xl shadow-xl transition-all flex items-center justify-center gap-4 text-[10px] uppercase tracking-[0.3em] haptic-tap active:scale-95 border border-white/5">
                            <FilePdfIcon className="w-5 h-5" /> Download Legacy PDF
                        </button>
                        <button onClick={handleDownloadImages} disabled={isExportingImages} className="py-7 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-3xl shadow-xl transition-all flex items-center justify-center gap-4 text-[10px] uppercase tracking-[0.3em] haptic-tap active:scale-95 disabled:opacity-20">
                            {isExportingImages ? <Loader2Icon className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5 text-gemynd-agedGold" />}
                            Bundle Visual Assets
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ShareModal;