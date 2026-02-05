import React, { useState } from 'react';
import ConnieChatWidget from '../../components/ConnieChatWidget';
import XMarkIcon from '../../components/icons/XMarkIcon';
import ImageIcon from '../../components/icons/ImageIcon';
import CheckIcon from '../../components/icons/CheckIcon';
import { storageService } from '../../services/storageService';
import { fileToBase64 } from '../../utils/fileUtils';
import TrashIcon from '../../components/icons/TrashIcon';

interface ConnieFullScreenProps {
  subject: string;
  onFinish: (data: { transcript: string }) => void;
  onBack: () => void;
}

export const ConnieFullScreen: React.FC<ConnieFullScreenProps> = ({ subject, onFinish, onBack }) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stagedPhotos, setStagedPhotos] = useState<string[]>([]);
  const [conversationData, setConversationData] = useState<{ transcript: string } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsUploading(true);
    // FIX: Explicitly type 'files' as 'File[]' to resolve TypeScript 'unknown' errors when iterating over FileList.
    const files: File[] = Array.from(e.target.files);
    
    for (const file of files) {
        try {
            const base64 = await fileToBase64(file);
            await storageService.uploadFile(file, { title: `Contribution for ${subject}`, tags: ['storyteller_session'] });
            setStagedPhotos(prev => [...prev, `data:${file.type};base64,${base64}`]);
        } catch (err) {
            console.error("Upload node failure", err);
        }
    }
    setIsUploading(false);
  };

  const handleChatComplete = (data: { transcript: string }) => {
    setConversationData(data);
  };

  return (
    <div className="h-full w-full bg-gemynd-linen flex flex-col animate-fade-in">
      {/* Guided Header */}
      <header className="p-6 border-b border-gemynd-softPeach bg-white/50 backdrop-blur-md flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
          <img src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" className="w-8" alt="Logo" />
          <div>
            <h2 className="text-sm font-bold text-gemynd-ink">Talking about {subject}</h2>
            <p className="text-[10px] text-gemynd-oxblood font-bold uppercase tracking-widest">Active Interview Mode</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="px-5 py-2.5 bg-white border border-gemynd-ink/10 rounded-full text-[10px] font-black uppercase tracking-widest text-gemynd-ink hover:bg-gemynd-linen transition-colors flex items-center gap-2 shadow-sm"
          >
            <ImageIcon className="w-4 h-4" /> Add Photos
          </button>
          
          {conversationData ? (
             <button 
              onClick={() => onFinish(conversationData)}
              className="px-6 py-2.5 bg-gemynd-oxblood text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-3 animate-pulse"
            >
              <CheckIcon className="w-4 h-4" /> Done Talking
            </button>
          ) : (
            <button onClick={onBack} className="p-2.5 text-gemynd-ink/20 hover:text-gemynd-oxblood transition-colors"><XMarkIcon className="w-6 h-6"/></button>
          )}
        </div>
      </header>

      {/* Primary Experience Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-6 lg:p-12 overflow-hidden">
        <div className="absolute inset-0 paper-grain opacity-10 pointer-events-none" />
        
        <div className="w-full max-w-2xl h-full flex flex-col relative">
          <ConnieChatWidget 
            isOpen={true} 
            setIsOpen={() => {}} 
            onConversationEnd={handleChatComplete}
            onExecuteCommand={() => {}}
            initialGreeting={`I'd love to hear about ${subject}. What's a memory that comes to mind?`}
            hideTrigger={true}
          />
        </div>
      </div>

      {/* Drawer Overlay for Photos - Reusing existing simplified upload logic */}
      <div className={`fixed inset-x-0 bottom-0 z-40 bg-white shadow-2xl rounded-t-[3rem] border-t border-gemynd-softPeach transition-transform duration-500 ease-in-out ${isUploadOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="p-10">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-display font-black text-gemynd-ink">Artifact Ingestion</h3>
                    <p className="text-[10px] text-gemynd-oxblood uppercase font-bold tracking-widest">Active Upload Node</p>
                </div>
                <button onClick={() => setIsUploadOpen(false)} className="p-2 bg-gemynd-linen rounded-full text-gemynd-ink/40"><XMarkIcon className="w-5 h-5"/></button>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
                <label className="aspect-square rounded-[2rem] border-2 border-dashed border-gemynd-oxblood/20 bg-gemynd-linen flex flex-col items-center justify-center cursor-pointer hover:bg-gemynd-oxblood/5 transition-colors group">
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                    {isUploading ? (
                        <div className="w-8 h-8 border-2 border-gemynd-oxblood border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <ImageIcon className="w-8 h-8 text-gemynd-oxblood/40 group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black uppercase text-gemynd-oxblood/40 mt-3 tracking-widest">Upload</span>
                        </>
                    )}
                </label>
                {stagedPhotos.map((src, i) => (
                    <div key={i} className="aspect-square rounded-[2rem] overflow-hidden border border-gemynd-softPeach shadow-sm group relative">
                         <img src={src} className="w-full h-full object-cover" alt="Contribution" />
                    </div>
                ))}
            </div>

            <button onClick={() => setIsUploadOpen(false)} className="w-full py-5 bg-gemynd-oxblood text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Continue Conversation</button>
        </div>
      </div>

      {isUploadOpen && <div className="fixed inset-0 bg-black/20 z-30 animate-fade-in" onClick={() => setIsUploadOpen(false)} />}
      
      <style>{`
        .fixed.bottom-6.right-6.z-\\[100\\] {
           position: relative !important;
           right: 0 !important;
           bottom: 0 !important;
           width: 100% !important;
           height: 100% !important;
           flex-grow: 1 !important;
           padding: 0 !important;
        }
        .w-80.h-\\[450px\\] {
           width: 100% !important;
           height: 100% !important;
           border: none !important;
           box-shadow: none !important;
           border-radius: 0 !important;
           background: transparent !important;
        }
        .w-80.h-\\[450px\\] header { background: transparent !important; border-bottom: none !important; }
        .w-80.h-\\[450px\\] .flex-1.overflow-y-auto { background: transparent !important; padding: 2rem 0 !important; }
        .w-80.h-\\[450px\\] footer { background: transparent !important; border-top: none !important; }
        .w-80.h-\\[450px\\] input { background: white !important; border: 1px solid rgba(150, 45, 45, 0.1) !important; border-radius: 2rem !important; padding: 1rem 1.5rem !important; }
      `}</style>
    </div>
  );
};