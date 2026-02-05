
import React from 'react';
import { SampleStory } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

interface SampleStoryAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    story: SampleStory | null;
    onLoad: (story: SampleStory) => void;
}

const SampleStoryAssetModal: React.FC<SampleStoryAssetModalProps> = ({ isOpen, onClose, story, onLoad }) => {
    if (!isOpen || !story) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-2xl w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 flex flex-col"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="asset-modal-title"
            >
                <header className="flex justify-between items-center p-4 border-b border-slate-300 dark:border-slate-700/50 flex-shrink-0">
                    <h2 id="asset-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">Assets for {story.name}'s Story</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Close modal">
                        <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Images</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                            {story.assets.images.map((img, index) => (
                                <a key={index} href={img} target="_blank" rel="noopener noreferrer" className="aspect-square block rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-700 hover:border-blue-500 transition-colors">
                                    <img src={img} alt={`${story.name} - asset ${index + 1}`} className="w-full h-full object-cover"/>
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Source Materials</h3>
                        <div className="space-y-2">
                             <a href={story.assets.storyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-200 dark:bg-slate-800/50 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700/50 transition-colors">
                                <DocumentTextIcon className="w-5 h-5 text-slate-600 dark:text-slate-400"/>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Story Transcript (Eleanor.txt)</span>
                             </a>
                             <a href={story.assets.elementsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-200 dark:bg-slate-800/50 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700/50 transition-colors">
                                <DocumentTextIcon className="w-5 h-5 text-slate-600 dark:text-slate-400"/>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Key Elements (Eleanor-elements.txt)</span>
                             </a>
                        </div>
                    </div>
                </main>

                <footer className="p-4 border-t border-slate-300 dark:border-slate-700/50 flex-shrink-0">
                    <button
                        onClick={() => {
                            onLoad(story);
                            onClose();
                        }}
                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        Use These Assets to Create a Story
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default SampleStoryAssetModal;
