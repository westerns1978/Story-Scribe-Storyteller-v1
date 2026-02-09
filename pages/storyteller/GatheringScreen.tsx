import React, { useState } from 'react';
import MicrophoneIcon from '../../components/icons/MicrophoneIcon';
import ImageIcon from '../../components/icons/ImageIcon';
import DocumentTextIcon from '../../components/icons/DocumentTextIcon';
import SparklesIcon from '../../components/icons/SparklesIcon';
import TrashIcon from '../../components/icons/TrashIcon';
import { NeuralAsset } from '../../types';
import { storageService } from '../../services/storageService';
import { fileToBase64, extractTextFromPdf } from '../../utils/fileUtils';
import Loader2Icon from '../../components/icons/Loader2Icon';

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
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsUploading(true);
    
    const files: File[] = Array.from(e.target.files);
    const newAssets: NeuralAsset[] = [];
    
    for (const file of files) {
      try {
        if (file.type.startsWith('image/')) {
          const asset = await storageService.uploadFile(file, { title: file.name, tags: ['gathering'] });
          newAssets.push(asset);
        } else if (file.type === 'application/pdf' || file.type === 'text/plain') {
          let content = '';
          if (file.type === 'application/pdf') {
              content = await extractTextFromPdf(file);
          } else {
              content = await file.text();
          }
          onText(file.name, content);
        }
      } catch (err) {
        console.error("[Gathering] node failure:", err);
      }
    }
    
    if (newAssets.length > 0) onPhotos(newAssets);
    setIsUploading(false);
  };

  const totalArtifacts = material.artifacts.length;
  const totalTextNodes = material.importedTexts.length + (material.transcript ? 1 : 0);
  const totalMaterials = totalArtifacts + totalTextNodes;

  const getTierInfo = () => {
    if (totalArtifacts >= 8) return { label: 'Heritage Archive', tier: 'Premium', desc: 'Museum-quality cinematic production' };
    if (totalArtifacts >= 4) return { label: 'Legacy Weave', tier: 'Standard', desc: 'Deep narrative with expanded visual beats' };
    return { label: 'Quick Memory', tier: 'Quick', desc: 'Beautiful summary of life highlights' };
  };

  const tierInfo = getTierInfo();

  return (
    <div className="h-full w-full bg-[#0D0B0A] flex flex-col overflow-hidden animate-fade-in relative text-white selection:bg-amber-500">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gemynd-oxblood/10 blur-[150px] rounded-full pointer-events-none" />
      
      <header className="p-8 lg:p-12 flex justify-between items-center z-20">
        <div className="flex items-center gap-6">
          <img src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" className="w-10 h-10" alt="Logo" />
          <div className="h-10 w-px bg-white/10 hidden sm:block" />
          <div>
            <h1 className="text-2xl font-display font-black tracking-tight">Memory Ingestion</h1>
            <p className="text-[10px] text-gemynd-agedGold font-black uppercase tracking-[0.4em] mt-1">Archive Subject: {subject}</p>
          </div>
        </div>
        <button onClick={onExit} className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all haptic-tap">Cancel</button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 lg:px-20 py-4 scroll-viewport">
        <div className="max-w-3xl mx-auto space-y-16">
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter">Add Memories</h2>
              <p className="text-white/40 font-serif italic text-xl">Deposit photos or documents to begin the weave.</p>
            </div>
            
            <label className="relative group cursor-pointer block haptic-tap">
              <input type="file" multiple className="hidden" onChange={handleFileUpload} />
              <div className="aspect-[21/9] border-2 border-dashed border-white/10 bg-white/[0.03] rounded-[4rem] flex flex-col items-center justify-center p-12 transition-all group-hover:border-gemynd-oxblood/40 group-hover:bg-white/[0.05] shadow-2xl">
                {isUploading ? (
                  <div className="flex flex-col items-center gap-6">
                    <Loader2Icon className="w-16 h-16 text-gemynd-oxblood" />
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gemynd-oxblood animate-pulse">Uplinking Data...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-all duration-700 shadow-xl border border-white/5">
                      <ImageIcon className="w-10 h-10 text-white/30" />
                    </div>
                    <p className="text-2xl font-bold tracking-tight">Drop photos or tap to upload</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] mt-4 font-black">JPG, PNG, PDF supported</p>
                  </>
                )}
              </div>
            </label>

            <div className="flex items-center gap-8 py-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.6em]">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button 
              onClick={onTalk}
              className="w-full py-12 bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-[3rem] flex items-center justify-center gap-8 group transition-all haptic-tap shadow-xl"
            >
              <div className="w-16 h-16 bg-gemynd-oxblood/20 text-gemynd-oxblood rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-lg">
                <MicrophoneIcon className="w-8 h-8" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold tracking-tight">Talk with Connie</p>
                <p className="text-sm text-white/40 font-serif italic mt-1 leading-relaxed">Speak naturally, she'll capture the story for you.</p>
              </div>
            </button>
          </div>

          {totalMaterials > 0 && (
            <section className="bg-white/[0.02] border border-white/5 p-12 rounded-[4rem] space-y-10 animate-appear shadow-2xl">
              <div className="flex justify-between items-end border-b border-white/5 pb-8">
                 <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-2">Vault Inventory</h3>
                    <p className="text-2xl font-display font-bold text-white tracking-tight">{totalMaterials} Item{totalMaterials !== 1 ? 's' : ''} Gathered</p>
                 </div>
                 <div className="text-right">
                    <div className="flex items-center gap-3 justify-end mb-2">
                      <SparklesIcon className="w-5 h-5 text-gemynd-agedGold" />
                      <span className="text-[10px] font-black uppercase text-gemynd-agedGold tracking-[0.2em]">{tierInfo.label} Level</span>
                    </div>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">{tierInfo.desc}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {material.transcript && (
                  <div className="aspect-square bg-rose-500/5 border border-rose-500/20 p-6 rounded-[2rem] flex flex-col justify-between items-start group relative transition-all hover:bg-rose-500/10">
                    <MicrophoneIcon className="w-6 h-6 text-rose-500" />
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 opacity-60">Voice Session</span>
                        <p className="text-[9px] text-white/20 mt-1 uppercase font-bold">Synchronised</p>
                    </div>
                  </div>
                )}
                {material.artifacts.map((a) => (
                  <div key={a.id} className="aspect-square rounded-[2rem] overflow-hidden border border-white/10 relative group shadow-lg">
                    <img src={a.public_url} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" alt="Artifact" />
                    <button 
                        onClick={() => onRemoveArtifact(a.id)}
                        className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-gemynd-oxblood rounded-full opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100"
                    >
                        <TrashIcon className="w-4 h-4 text-white"/>
                    </button>
                    {a.id.startsWith('restored-') && (
                        <div className="absolute bottom-4 left-4 px-3 py-1 bg-amber-500 text-black text-[8px] font-black rounded-full uppercase tracking-widest shadow-lg">Restored</div>
                    )}
                  </div>
                ))}
                {material.importedTexts.map((t, i) => (
                  <div key={i} className="aspect-square bg-blue-500/5 border border-blue-500/20 p-6 rounded-[2rem] flex flex-col justify-between items-start group relative transition-all hover:bg-blue-500/10">
                    <DocumentTextIcon className="w-6 h-6 text-blue-500" />
                    <div className="space-y-1 w-full">
                        <p className="text-[10px] font-black text-white leading-tight truncate uppercase tracking-tighter">{t.name}</p>
                        <span className="text-[8px] uppercase font-black text-blue-400/60 tracking-widest">Historical Record</span>
                    </div>
                    <button 
                        onClick={() => onRemoveText(i)}
                        className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-gemynd-oxblood rounded-full opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100"
                    >
                        <TrashIcon className="w-4 h-4 text-white"/>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="p-10 lg:p-14 bg-[#050404] border-t border-white/5 z-30 shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
        <div className="max-w-md mx-auto text-center space-y-8">
          <button 
            onClick={onCreate}
            disabled={totalMaterials === 0}
            className="w-full py-8 bg-gemynd-oxblood text-white font-black rounded-full shadow-[0_20px_60px_rgba(168,45,45,0.4)] hover:bg-gemynd-red hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.6em] disabled:opacity-10 disabled:grayscale flex items-center justify-center gap-5 border border-white/10"
          >
            <SparklesIcon className="w-5 h-5" />
            Create the Story
          </button>
          <div className="space-y-2 opacity-40">
             <p className="text-[9px] text-white/50 uppercase tracking-[0.4em] font-black">Neural Synthesis Engine Ready</p>
          </div>
        </div>
      </footer>
    </div>
  );
};