
import React, { useState, useEffect, useCallback, DragEvent } from 'react';
import { storageService } from '../services/storageService';
import { extractDocumentDNA } from '../services/api';
import { fileToBase64 } from '../utils/fileUtils';
import BoltIcon from './icons/BoltIcon';
import XMarkIcon from './icons/XMarkIcon';
import DocumentArrowUpIcon from './icons/DocumentArrowUpIcon';
import SparklesIcon from './icons/SparklesIcon';
import { NeuralAsset } from '../types';

interface NeuralIngestionNodeProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetIngested: (asset: NeuralAsset) => void;
}

export const NeuralIngestionNode: React.FC<NeuralIngestionNodeProps> = ({ isOpen, onClose, onAssetIngested }) => {
  const [uplinkStatus, setUplinkStatus] = useState<'offline' | 'healthy'>('offline');
  const [isDragging, setIsDragging] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [transmissionProgress, setTransmissionProgress] = useState(0);
  const [isTransmitting, setIsTransmitting] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  };

  useEffect(() => {
    if (isOpen) {
      storageService.checkConnection().then(res => {
        setUplinkStatus(res.status as any);
        addLog(`NEURAL_UPLINK: ${res.message.toUpperCase()}`);
      });
    }
  }, [isOpen]);

  const handleIngest = async (files: FileList) => {
    if (files.length === 0 || isTransmitting) return;
    
    setIsTransmitting(true);
    setTransmissionProgress(10);
    const file = files[0];
    
    addLog(`INITIATING_TRANSMISSION: ${file.name}`);
    
    try {
      // 1. Multimodal Pipe: DNA Extraction
      addLog("EXTRACTING_DOCUMENT_DNA: ANALYZING...");
      setTransmissionProgress(30);
      const base64 = await fileToBase64(file);
      const dna = await extractDocumentDNA(base64, file.type);
      addLog(`DNA_EXTRACTED: ${dna.title.toUpperCase()}`);
      setTransmissionProgress(60);

      // 2. High-Voltage Transmission: Supabase Upload
      addLog("COMMITTING_TO_VAULT: PDS_LEXINGTON_NODE...");
      const asset = await storageService.uploadFile(file, dna);
      
      setTransmissionProgress(100);
      addLog("TRANSMISSION_COMPLETE: ARTIFACT_SECURED");
      
      setTimeout(() => {
        onAssetIngested(asset);
        setIsTransmitting(false);
        setTransmissionProgress(0);
      }, 1000);

    } catch (err: any) {
      addLog(`TRANSMISSION_ERROR: ${err.message || 'LINK_FAILURE'}`);
      setIsTransmitting(false);
      setTransmissionProgress(0);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleIngest(e.dataTransfer.files);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-4xl bg-white/5 border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(255,184,0,0.1)] overflow-hidden flex flex-col lg:flex-row h-[80vh]">
        
        {/* Left Panel: The Surge Chamber */}
        <div className="flex-1 p-10 flex flex-col justify-between relative border-r border-white/5">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFB800] to-transparent opacity-50" />
          
          <header className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <BoltIcon className="w-8 h-8 text-[#FFB800] animate-pulse" />
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Neural Ingestion Node</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${uplinkStatus === 'healthy' ? 'bg-[#FFB800] animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-mono text-white/40 tracking-[0.2em] uppercase">
                    {uplinkStatus === 'healthy' ? 'UPLINK_STABLE' : 'UPLINK_OFFLINE'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <XMarkIcon className="w-6 h-6 text-white/60" />
            </button>
          </header>

          <main className="flex-1 flex flex-col items-center justify-center mt-8">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`w-full max-w-md aspect-square rounded-[3rem] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center text-center p-8 group relative overflow-hidden ${
                isDragging ? 'border-[#FFB800] bg-[#FFB800]/5 scale-105' : 'border-white/10 hover:border-white/30'
              }`}
            >
              {isTransmitting ? (
                <div className="relative z-10 w-full px-8">
                  <div className="w-20 h-20 bg-[#FFB800]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <SparklesIcon className="w-10 h-10 text-[#FFB800] animate-spin" />
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#FFB800] to-[#FFD700] transition-all duration-500 shadow-[0_0_15px_#FFB800]"
                      style={{ width: `${transmissionProgress}%` }}
                    />
                  </div>
                  <p className="mt-4 font-mono text-[#FFB800] text-xs animate-pulse">TRANSMITTING_DATA...</p>
                </div>
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-b from-[#FFB800]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <DocumentArrowUpIcon className="w-16 h-16 text-white/20 group-hover:text-[#FFB800] group-hover:scale-110 transition-all duration-500 mb-6" />
                  <h3 className="text-xl font-bold text-white mb-2">Initialize Transmission</h3>
                  <p className="text-white/40 text-sm max-w-[200px]">Drop historical records or scan artifacts to neural vault.</p>
                  <input 
                    type="file" 
                    onChange={e => e.target.files && handleIngest(e.target.files)} 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </>
              )}
            </div>
          </main>

          <footer className="mt-8">
            <p className="text-[10px] font-mono text-white/20 tracking-widest uppercase">Solaris High-Voltage Archive System v4.0</p>
          </footer>
        </div>

        {/* Right Panel: Transmission Telemetry */}
        <div className="lg:w-80 bg-black/40 p-10 flex flex-col font-mono text-[10px]">
          <h3 className="text-white/40 tracking-widest uppercase mb-6 border-b border-white/5 pb-2">Telemetry Log</h3>
          <div className="flex-1 overflow-hidden space-y-3">
            {logs.map((log, i) => (
              <div key={i} className={`flex items-start gap-3 transition-opacity duration-500 ${i === 0 ? 'text-[#FFB800]' : 'text-white/40'}`}>
                <span className="flex-shrink-0">›</span>
                <p className="break-words leading-relaxed uppercase">{log}</p>
              </div>
            ))}
            {logs.length === 0 && <p className="text-white/10 italic">Awaiting transmission signal...</p>}
          </div>
          
          <div className="mt-10 pt-6 border-t border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white/20">NODE_LOC</span>
              <span className="text-white/60">LEXINGTON_KY</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/20">PROTOCOL</span>
              <span className="text-[#FFB800]">GEMYND_SHIELD</span>
            </div>
            <div className="w-full h-24 bg-white/5 rounded-xl border border-white/5 overflow-hidden flex items-end p-2 gap-1">
              {/* Fake visualizer bars */}
              {Array.from({ length: 20 }).map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1 bg-[#FFB800]/20 rounded-t-sm"
                  style={{ 
                    height: `${Math.random() * 80 + 20}%`,
                    animation: `telemetry-surge 2s ease-in-out infinite ${i * 0.1}s`
                  }} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes telemetry-surge {
          0%, 100% { transform: scaleY(0.5); opacity: 0.3; }
          50% { transform: scaleY(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
