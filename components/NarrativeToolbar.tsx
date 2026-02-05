
import React, { useState } from 'react';
import ClipboardIcon from './icons/ClipboardIcon';
import ArrowDownTrayIcon from './icons/ArrowDownTrayIcon';
import ClipboardDocumentCheckIcon from './icons/ClipboardDocumentCheckIcon';
import SpeakerWaveIcon from './icons/SpeakerWaveIcon';
import ShieldIcon from './icons/ShieldIcon';
import { verifyHistoricalFacts } from '../services/api';
import XMarkIcon from './icons/XMarkIcon';
import ExternalLinkIcon from './icons/ExternalLinkIcon';

interface NarrativeToolbarProps {
  narrative: string;
  onNarrativeChange: (newNarrative: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warn') => void;
  narrationAudio: { url: string | null; isLoading: boolean };
  onGenerateNarration: (voice: string) => void;
  credits?: number;
}

const ToolbarButton: React.FC<{
    label: string;
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
}> = ({ label, onClick, children, disabled, className }) => (
    <button
        onClick={onClick}
        title={label}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className || 'text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white'}`}
    >
        {children}
        <span className="hidden sm:inline">{label}</span>
    </button>
);

const NarrativeToolbar: React.FC<NarrativeToolbarProps> = ({ narrative, onNarrativeChange, showToast, narrationAudio, onGenerateNarration, credits }) => {
    const [selectedVoice, setSelectedVoice] = useState('Kore');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyResult, setVerifyResult] = useState<{ text: string; sources: any[] } | null>(null);

    const voices = [
        { name: 'Kore', label: 'Kore (Warm)' },
        { name: 'Puck', label: 'Puck (Neutral)' },
        { name: 'Charon', label: 'Charon (Deep)' },
        { name: 'Fenrir', label: 'Fenrir (Resonant)' },
        { name: 'Zephyr', label: 'Zephyr (Bright)' },
    ];

    const handleCopy = () => {
        navigator.clipboard.writeText(narrative)
            .then(() => showToast('Narrative copied to clipboard.', 'success'))
            .catch(() => showToast('Failed to copy narrative.', 'error'));
    };

    const handleExport = () => {
        try {
            const blob = new Blob([narrative], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `story_narrative.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('Narrative exported as .txt file.', 'success');
        } catch (error) {
            showToast('Failed to export narrative.', 'error');
        }
    };

    const handleReplace = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                onNarrativeChange(text);
                showToast('Narrative replaced from clipboard.', 'success');
            } else {
                showToast('Clipboard is empty.', 'warn');
            }
        } catch (error) {
             showToast('Failed to read from clipboard.', 'error');
        }
    };

    const handleVerifyFacts = async () => {
        if (!narrative || narrative.length < 50) {
            showToast("Manuscript too short for historical audit.", "warn");
            return;
        }
        setIsVerifying(true);
        try {
            const result = await verifyHistoricalFacts(narrative);
            setVerifyResult(result);
        } catch (e) {
            showToast("Historical audit failed.", "error");
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <ToolbarButton label="Copy" onClick={handleCopy}>
                    <ClipboardIcon className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton label="Export" onClick={handleExport}>
                    <ArrowDownTrayIcon className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton label="Paste" onClick={handleReplace}>
                    <ClipboardDocumentCheckIcon className="w-4 h-4" />
                </ToolbarButton>
                
                <div className="w-px h-6 bg-slate-700 mx-1 hidden sm:block"></div>
                
                <ToolbarButton 
                    label={isVerifying ? "Verifying..." : "Verify Facts"} 
                    onClick={handleVerifyFacts} 
                    disabled={isVerifying}
                    className="bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 border border-blue-500/30"
                >
                    {isVerifying ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span> : <ShieldIcon className="w-4 h-4" />}
                </ToolbarButton>

                <div className="w-px h-6 bg-slate-700 mx-1 hidden sm:block"></div>

                <select 
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="bg-slate-700 text-slate-200 text-xs rounded-md px-2 py-1.5 border-none focus:ring-1 focus:ring-blue-500"
                >
                    {voices.map(v => <option key={v.name} value={v.name}>{v.label}</option>)}
                </select>

                 <ToolbarButton label={narrationAudio.isLoading ? "Generating..." : "Narration"} onClick={() => onGenerateNarration(selectedVoice)} disabled={narrationAudio.isLoading}>
                    {narrationAudio.isLoading ? <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div> : <SpeakerWaveIcon className="w-4 h-4" />}
                </ToolbarButton>
            </div>

            {verifyResult && (
                <div className="p-4 bg-slate-800 border border-blue-500/30 rounded-xl animate-fade-in relative group/verify">
                    <button onClick={() => setVerifyResult(null)} className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full text-slate-500">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                    <h5 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <ShieldIcon className="w-3 h-3" /> Search-Grounded Historical Audit
                    </h5>
                    <p className="text-sm text-slate-300 leading-relaxed mb-4">{verifyResult.text}</p>
                    {verifyResult.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {verifyResult.sources.map((src, i) => (
                                <a key={i} href={src.web?.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-blue-400 transition-colors">
                                    <ExternalLinkIcon className="w-2.5 h-2.5" />
                                    {src.web?.title}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}

             {narrationAudio.url && (
                <div className="p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <audio controls src={narrationAudio.url} className="w-full h-10"></audio>
                </div>
            )}
        </div>
    );
};

export default NarrativeToolbar;
