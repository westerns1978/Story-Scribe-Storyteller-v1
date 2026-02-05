import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JSZip from 'jszip';
import { ActiveStory, StoryArchiveItem } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import ShareIcon from './icons/ShareIcon';
import ImageIcon from './icons/ImageIcon';
import FilePdfIcon from './icons/FilePdfIcon';
import { exportStoryToPdf, generatePages } from '../utils/storybookUtils';
import Loader2Icon from './icons/Loader2Icon';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    story: StoryArchiveItem | ActiveStory | null;
    showToast?: (msg: string, type: 'success' | 'error' | 'warn') => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, story, showToast }) => {
    const [isExportingImages, setIsExportingImages] = useState(false);
    const [copyStatus, setCopyStatus] = useState('Copy Link');

    if (!story) return null;
    if (!isOpen) return null;

    const storyUrl = `${window.location.origin}/legacy/${story.sessionId || (story as any).id || 'unknown'}`;
    const summary = story.summary || story.extraction?.summary || "A Gemynd Legacy Archive.";
    const storyTitle = story.storytellerName || 'Legacy Story';

    const handleCopyLink = () => {
        try {
            navigator.clipboard.writeText(storyUrl).then(() => {
                setCopyStatus('Copied!');
                showToast?.("Link secured to clipboard.", "success");
                setTimeout(() => setCopyStatus('Copy Link'), 2000);
            });
        } catch (e) {
            showToast?.("Clipboard access denied.", "error");
        }
    };

    const handleDownloadPdf = async () => {
        try {
            showToast?.("Synthesizing Legacy PDF...", "success");
            const pages = generatePages(story as StoryArchiveItem);
            if (!pages || pages.length === 0) throw new Error("No pages generated");
            await exportStoryToPdf(pages, storyTitle);
        } catch (e) {
            console.error("PDF Fail", e);
            showToast?.("PDF Generation Node Failure.", "error");
        }
    };

    const handleDownloadImages = async () => {
        const validImages = (story.generatedImages || []).filter(img => img.image_url && img.success);
        if (validImages.length === 0) {
            showToast?.("No visual artifacts detected.", "warn");
            return;
        }

        setIsExportingImages(true);
        try {
            const zip = new JSZip();
            const folder = zip.folder(`${storyTitle.replace(/\s+/g, '_')}_Artifacts`);
            
            for (let i = 0; i < validImages.length; i++) {
                const img = validImages[i];
                try {
                    const response = await fetch(img.image_url);
                    const blob = await response.blob();
                    const filename = `artifact_${i + 1}.png`;
                    folder?.file(filename, blob);
                } catch (e) {
                    console.warn(`Failed to fetch image ${i}`, e);
                }
            }

            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `${storyTitle.replace(/\s+/g, '_')}_Vault.zip`;
            link.click();
            showToast?.("Visual vault secured.", "success");
        } catch (e) {
            showToast?.("Compression node failed.", "error");
        } finally {
            setIsExportingImages(false);
        }
    };

    const handleShareViaSMS = () => {
        const text = `Explore the legacy of ${storyTitle}: ${storyUrl}`;
        window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
    };

    const handleShareViaEmail = () => {
        const subject = `Legacy Archive: ${storyTitle}`;
        const body = `I want to share this digital storybook with you. It preserves the cherished memories and artifacts of ${storyTitle}.\n\nView here: ${storyUrl}\n\nGenerated via Gemynd Story Scribe.`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleNativeShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `Legacy: ${storyTitle}`,
                text: summary,
                url: storyUrl,
            }).catch((err) => {
                if (err.name !== 'AbortError') showToast?.("Native share failed.", "error");
            });
        }
    };

    const SocialButton: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void; color?: string }> = ({ label, icon, onClick, color }) => (
        <button 
            onClick={onClick}
            className="flex flex-col items-center gap-3 p-5 glass-tier-2 rounded-3xl transition-all group hover:bg-white/10 active:scale-95"
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${color || 'text-white'}`}>
                {icon}
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[500] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="w-full max-w-2xl bg-[#0d0b0a] border border-white/10 rounded-[3.5rem] p-8 lg:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Decorative Rim Light */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gemynd-red to-transparent opacity-40" />
                
                <header className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gemynd-oxblood/20 rounded-2xl border border-gemynd-oxblood/30">
                            <ShareIcon className="w-6 h-6 text-gemynd-red" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-display font-black text-white tracking-tighter leading-none">Legacy Distribution</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1.5">Secure Artifact Uplink</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/30 transition-colors"><XMarkIcon className="w-7 h-7" /></button>
                </header>

                <main className="space-y-10">
                    {/* QR and Link Node */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white/[0.03] p-8 rounded-[3rem] border border-white/5">
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-white p-5 rounded-[2rem] shadow-2xl transition-transform hover:scale-105 duration-500">
                                {typeof QRCodeSVG !== 'undefined' ? (
                                    <QRCodeSVG value={storyUrl} size={150} includeMargin={true} />
                                ) : (
                                    <div className="w-[150px] h-[150px] bg-slate-200 animate-pulse rounded-xl" />
                                )}
                            </div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Neural Scanning Code</span>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                                <label className="text-[9px] font-bold text-amber-500/50 uppercase tracking-widest ml-1">Direct URL</label>
                                <div className="text-xs font-mono text-slate-300 truncate opacity-60 px-1">{storyUrl}</div>
                            </div>
                            <button 
                                onClick={handleCopyLink} 
                                className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 text-xs uppercase tracking-widest"
                            >
                                {copyStatus}
                            </button>
                        </div>
                    </div>

                    {/* Robust Sharing Options */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <SocialButton label="SMS Text" onClick={handleShareViaSMS} icon="📱" color="text-green-400" />
                        <SocialButton label="Email" onClick={handleShareViaEmail} icon="✉️" color="text-blue-400" />
                        <SocialButton label="Facebook" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storyUrl)}`)} icon="📘" color="text-blue-600" />
                        <SocialButton label="WhatsApp" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("Explore this legacy: " + storyUrl)}`)} icon="💬" color="text-green-500" />
                    </div>

                    {/* Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                            onClick={handleDownloadPdf} 
                            className="py-6 bg-gemynd-oxblood hover:bg-gemynd-red text-white font-black rounded-3xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 text-xs uppercase tracking-[0.2em]"
                        >
                            <FilePdfIcon className="w-5 h-5" /> Download Legacy PDF
                        </button>
                        <button 
                            onClick={handleDownloadImages}
                            disabled={isExportingImages}
                            className="py-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-3xl transition-all active:scale-95 flex items-center justify-center gap-4 text-xs uppercase tracking-[0.2em] disabled:opacity-30"
                        >
                            {isExportingImages ? <Loader2Icon className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                            Pack Visual Vault
                        </button>
                    </div>

                    {navigator.share && (
                        <button 
                            onClick={handleNativeShare}
                            className="w-full py-4 text-slate-600 hover:text-white font-black text-[10px] uppercase tracking-[0.5em] transition-colors flex items-center justify-center gap-3"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                            Use Native Share Sheet
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                        </button>
                    )}
                </main>

                <footer className="mt-10 pt-8 border-t border-white/5 text-center">
                    <p className="text-[9px] text-white/10 font-mono tracking-[0.6em] uppercase">Lexington Distribution Node v4.2 • Secured</p>
                </footer>
            </div>
        </div>
    );
};

export default ShareModal;