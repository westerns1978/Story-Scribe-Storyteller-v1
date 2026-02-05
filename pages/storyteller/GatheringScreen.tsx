import React, { useState } from 'react';
import MicrophoneIcon from '../../components/icons/MicrophoneIcon';
import ImageIcon from '../../components/icons/ImageIcon';
import DocumentTextIcon from '../../components/icons/DocumentTextIcon';
import SparklesIcon from '../../components/icons/SparklesIcon';
import XMarkIcon from '../../components/icons/XMarkIcon';
import TrashIcon from '../../components/icons/TrashIcon';
import { NeuralAsset } from '../../types';
import { storageService } from '../../services/storageService';
import { fileToBase64, extractTextFromPdf } from '../../utils/fileUtils';
import { analyzeDocumentImage } from '../../services/api';

interface GatheringScreenProps {
  subject: string;
  material: {
    transcript: string;
    artifacts: NeuralAsset[];
    importedTexts: { name: string; content: string }[];
  };
  onTalk: () => void;
  onPhotos: (assets: NeuralAsset[]) => void;
  onText: (name: string, content: string) => void;
  onRemoveArtifact: (id: string) => void;
  onRemoveText: (index: number) => void;
  onCreate: () => void;
  onExit: () => void;
}

export const GatheringScreen: React.FC<GatheringScreenProps> = ({
  subject, material, onTalk, onPhotos, onText, onRemoveArtifact, onRemoveText, onCreate, onExit
}) => {
  const [isPhotoPanelOpen, setIsPhotoPanelOpen] = useState(false);
  const [isTextPanelOpen, setIsTextPanelOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [importText, setImportText] = useState('');

  const hasEnoughContent = material.transcript.length > 500 || 
                           material.artifacts.length >= 3 || 
                           material.importedTexts.some(t => t.content.length > 500);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsUploading(true);
    // FIX: Explicitly type 'files' as 'File[]' to resolve TypeScript 'unknown' errors when iterating over FileList.
    const files: File[] = Array.from(e.target.files);
    const newAssets: NeuralAsset[] = [];
    
    for (const file of files) {
      try {
        let dnaMetadata = { title: file.name, tags: ['gathering_session'] };
        // If it's a doc/pdf, we could try to extract text here for the session
        const asset = await storageService.uploadFile(file, dnaMetadata);
        newAssets.push(asset);
      } catch (err) {
        console.error("Upload failure", err);
      }
    }
    onPhotos(newAssets);
    setIsUploading(false);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    let content = '';
    if (file.type === 'application/pdf') {
      content = await extractTextFromPdf(file);
    } else if (file.type === 'text/plain') {
      content = await file.text();
    } else {
      alert("Unsupported text format. Please use .txt or .pdf");
      return;
    }
    
    if (content) {
      onText(file.name, content);
      setIsTextPanelOpen(false);
    }
  };

  return (
    <div className="h-full w-full bg-gemynd-linen flex flex-col overflow-hidden animate-fade-in relative">
      {/* Dynamic Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gemynd-oxblood/5 blur-[150px] rounded-full pointer-events-none" />
      
      <header className="p-6 lg:p-8 flex justify-between items-center z-20">
        <div className="flex items-center gap-6">
          <img src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" className="w-10" alt="Logo" />
          <div className="h-10 w-px bg-gemynd-softPeach hidden sm:block" />
          <div>
            <h1 className="text-xl lg:text-2xl font-display font-black text-gemynd-ink">Remembering {subject}</h1>
            <p className="text-[10px] text-gemynd-oxblood font-black uppercase tracking-widest">Collaborative Gathering Node</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-[10px] font-black uppercase tracking-widest text-gemynd-ink/30 hover:text-gemynd-ink">Help</button>
          <button onClick={onExit} className="px-5 py-2 bg-white border border-gemynd-ink/10 rounded-full text-[10px] font-black uppercase tracking-widest text-gemynd-ink hover:bg-gemynd-softPeach transition-colors">Exit</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 lg:px-20 py-10 scroll-viewport">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <InputCard 
              title="Talk with Connie"
              desc="Just speak naturally and Connie will guide you."
              icon={<MicrophoneIcon className="w-8 h-8" />}
              onClick={onTalk}
              accent="text-rose-600 bg-rose-50 border-rose-100"
            />
            <InputCard 
              title="Share Photos"
              desc="Upload photos, letters, or scanned documents."
              icon={<ImageIcon className="w-8 h-8" />}
              onClick={() => setIsPhotoPanelOpen(true)}
              accent="text-amber-600 bg-amber-50 border-amber-100"
            />
            <InputCard 
              title="Paste or Import"
              desc="Already have text? Paste or import a file."
              icon={<DocumentTextIcon className="w-8 h-8" />}
              onClick={() => setIsTextPanelOpen(true)}
              accent="text-blue-600 bg-blue-50 border-blue-100"
            />
          </div>

          {/* Session Tray */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gemynd-ink/40">Gathered Material</h2>
                <div className="flex-1 h-px bg-gemynd-softPeach" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
              {/* Connie Status */}
              {material.transcript && (
                <div className="col-span-2 bg-white p-6 rounded-[2rem] border border-gemynd-softPeach shadow-sm flex items-center gap-4 group">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
                        <MicrophoneIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gemynd-ink truncate">Connie Conversation</p>
                        <p className="text-[10px] text-gemynd-ink/40 font-medium uppercase tracking-widest mt-0.5">Transcript Loaded</p>
                    </div>
                </div>
              )}

              {/* Photos */}
              {material.artifacts.map((asset) => (
                <div key={asset.id} className="aspect-square bg-white rounded-[2rem] border border-gemynd-softPeach shadow-sm group relative overflow-hidden">
                    <img src={asset.public_url} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all" alt="Artifact" />
                    <button 
                      onClick={() => onRemoveArtifact(asset.id)}
                      className="absolute top-2 right-2 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                </div>
              ))}

              {/* Imported Texts */}
              {material.importedTexts.map((text, idx) => (
                <div key={idx} className="col-span-2 bg-white p-6 rounded-[2rem] border border-gemynd-softPeach shadow-sm flex items-center gap-4 group">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gemynd-ink truncate">{text.name}</p>
                        <p className="text-[10px] text-gemynd-ink/40 font-medium uppercase tracking-widest mt-0.5">Imported Node</p>
                    </div>
                    <button 
                      onClick={() => onRemoveText(idx)}
                      className="text-gemynd-ink/20 hover:text-gemynd-oxblood transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
              ))}

              {/* Empty State */}
              {!material.transcript && material.artifacts.length === 0 && material.importedTexts.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <p className="text-lg font-serif italic text-gemynd-ink/20 tracking-wide">The archive is currently empty. Choose a path above to contribute.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Persistent Footer Action */}
      <footer className="p-8 lg:p-12 bg-white/50 backdrop-blur-xl border-t border-gemynd-softPeach z-30 flex justify-center">
        <div className="max-w-md w-full text-center space-y-4">
          <button 
            onClick={onCreate}
            disabled={!hasEnoughContent}
            className="w-full py-6 bg-gemynd-oxblood text-white font-black rounded-full shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.4em] disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-4"
          >
            <SparklesIcon className="w-5 h-5" />
            Create the Story
          </button>
          <p className="text-[9px] font-bold text-gemynd-ink/30 uppercase tracking-[0.2em]">
            {hasEnoughContent ? "Ready for neural synthesis" : "Add more material to unlock the story weave"}
          </p>
        </div>
      </footer>

      {/* Photo Ingestion Modal */}
      {isPhotoPanelOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gemynd-mahogany/40 backdrop-blur-sm" onClick={() => setIsPhotoPanelOpen(false)} />
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.2)] p-10 relative z-10 animate-slide-up">
            <button onClick={() => setIsPhotoPanelOpen(false)} className="absolute top-8 right-8 text-gemynd-ink/20 hover:text-gemynd-oxblood"><XMarkIcon className="w-8 h-8"/></button>
            <header className="mb-10">
                <h3 className="text-3xl font-display font-black text-gemynd-ink">Share Photos</h3>
                <p className="text-sm font-serif italic text-gemynd-ink/50 mt-2">Visual memories add depth to the legacy weave.</p>
            </header>

            <label className="w-full aspect-[16/10] border-2 border-dashed border-gemynd-oxblood/10 bg-gemynd-linen rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-gemynd-oxblood/5 transition-all group mb-8">
              <input type="file" multiple accept="image/*,.pdf,.heic" className="hidden" onChange={handleFileUpload} />
              {isUploading ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-gemynd-oxblood border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gemynd-oxblood">Uploading Artifacts...</p>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-12 h-12 text-gemynd-oxblood/20 group-hover:scale-110 transition-transform mb-4" />
                  <p className="text-sm font-bold text-gemynd-ink/60">Drop files or tap to browse</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gemynd-ink/30 mt-2">Supports JPG, PNG, PDF, HEIC</p>
                </>
              )}
            </label>

            <div className="flex items-center gap-4 mb-10">
                <div className="h-px flex-1 bg-gemynd-softPeach" />
                <span className="text-[9px] font-black text-gemynd-ink/20 uppercase tracking-widest">Or Use Camera</span>
                <div className="h-px flex-1 bg-gemynd-softPeach" />
            </div>

            <button className="w-full py-5 bg-white border-2 border-gemynd-oxblood/10 rounded-2xl flex items-center justify-center gap-4 hover:bg-gemynd-linen transition-colors group">
                <div className="w-10 h-10 bg-gemynd-oxblood/5 rounded-xl flex items-center justify-center text-gemynd-oxblood group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gemynd-ink">Take Photo of Print</span>
            </button>
          </div>
        </div>
      )}

      {/* Text Modal */}
      {isTextPanelOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gemynd-mahogany/40 backdrop-blur-sm" onClick={() => setIsTextPanelOpen(false)} />
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.2)] p-10 relative z-10 animate-slide-up">
            <button onClick={() => setIsTextPanelOpen(false)} className="absolute top-8 right-8 text-gemynd-ink/20 hover:text-gemynd-oxblood"><XMarkIcon className="w-8 h-8"/></button>
            <header className="mb-10">
                <h3 className="text-3xl font-display font-black text-gemynd-ink">Paste or Import</h3>
                <p className="text-sm font-serif italic text-gemynd-ink/50 mt-2">Add written notes, journals, or family records.</p>
            </header>

            <textarea 
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-48 bg-gemynd-linen rounded-[2rem] p-8 font-serif text-lg italic outline-none border border-gemynd-oxblood/5 focus:border-gemynd-oxblood/20 transition-all resize-none placeholder:text-gemynd-ink/10"
              placeholder="Paste text here..."
            />

            <div className="flex gap-4 mt-8">
              <label className="flex-1 py-5 bg-white border-2 border-gemynd-oxblood/10 rounded-2xl flex items-center justify-center gap-4 hover:bg-gemynd-linen transition-colors cursor-pointer group">
                  <input type="file" accept=".txt,.pdf" className="hidden" onChange={handleImportFile} />
                  <DocumentTextIcon className="w-5 h-5 text-gemynd-oxblood/40 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-widest text-gemynd-ink">Import File</span>
              </label>
              <button 
                onClick={() => { if(importText.trim()) { onText('Pasted Text', importText); setIsTextPanelOpen(false); setImportText(''); } }}
                disabled={!importText.trim()}
                className="flex-[2] py-5 bg-gemynd-oxblood text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-30 transition-all"
              >
                Add to Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InputCard = ({ title, desc, icon, onClick, accent }: any) => (
  <button 
    onClick={onClick}
    className={`p-10 rounded-[3rem] border shadow-sm hover:shadow-xl transition-all duration-500 text-left group flex flex-col justify-between min-h-[280px] bg-white ${accent} hover:-translate-y-2`}
  >
    <div className="w-16 h-16 rounded-2xl bg-white border border-inherit flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
        {icon}
    </div>
    <div className="space-y-3">
        <h3 className="text-2xl font-display font-black tracking-tight text-gemynd-ink">{title}</h3>
        <p className="text-sm font-serif italic text-gemynd-ink/50 leading-relaxed">{desc}</p>
    </div>
    <div className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
        Open Component <span className="text-lg">→</span>
    </div>
  </button>
);