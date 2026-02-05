import React from 'react';
import { ActiveResult } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import ImageGallery from './ImageGallery';

interface VisualizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: ActiveResult | null;
}

const VisualizationModal: React.FC<VisualizationModalProps> = ({ isOpen, onClose, result }) => {
    if (!isOpen || !result) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-2xl w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Story Visualization: {result.name}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Close modal"
                    >
                        <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    {result.summary && (
                        <div className="prose dark:prose-invert max-w-none">
                            <h3>Story Summary</h3>
                            <p className="whitespace-pre-wrap">{result.summary}</p>
                        </div>
                    )}

                    {result.generatedImages && result.generatedImages.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Image Gallery</h3>
                            <ImageGallery images={result.generatedImages} />
                        </div>
                    )}

                    {(!result.summary && (!result.generatedImages || result.generatedImages.length === 0)) && (
                        <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                            <p>No summary or images have been generated for this story yet.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default VisualizationModal;
