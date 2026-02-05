import React, { useState } from 'react';
import { GeneratedImage } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import StoryImage from './StoryImage';
import ArrowPathIcon from './icons/ArrowPathIcon';
import VideoCameraIcon from './icons/VideoCameraIcon';
import WandIcon from './icons/WandIcon';
import SparklesIcon from './icons/SparklesIcon';
import { editImageWithText } from '../services/api';

interface ImageGalleryProps {
    images: GeneratedImage[];
    onRetry?: (index: number) => void;
    onAnimate?: (index: number, imageUrl: string) => void;
    animatingIndex?: number | null;
    onImageUpdated?: (index: number, newUrl: string) => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, onRetry, onAnimate, animatingIndex, onImageUpdated }) => {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [isProcessingEdit, setIsProcessingEdit] = useState(false);

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingIndex === null || !editPrompt.trim() || isProcessingEdit) return;

        const originalImage = images.find(img => img.index === editingIndex);
        if (!originalImage?.image_url) return;

        setIsProcessingEdit(true);
        try {
            const newUrl = await editImageWithText(originalImage.image_url, editPrompt);
            if (onImageUpdated) {
                onImageUpdated(editingIndex, newUrl);
            }
            setEditingIndex(null);
            setEditPrompt('');
        } catch (err) {
            console.error("Edit failed:", err);
            alert("Image edit failed. Please try a different prompt.");
        } finally {
            setIsProcessingEdit(false);
        }
    };

    if (!images || !Array.isArray(images) || images.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {images.map((image, index) => {
                const isPending = image.error === 'pending';
                
                if (!image.success && !isPending) {
                    return (
                        <div key={index} className="group relative overflow-hidden rounded-2xl border border-red-500/20 bg-gemynd-linen/50 dark:bg-white/5 aspect-square flex flex-col items-center justify-center p-6 text-center hover:scale-[1.02] transition-all duration-500">
                            <XMarkIcon className="w-10 h-10 text-red-500/40 mb-3" />
                            <p className="text-[10px] font-black uppercase text-red-500/60 tracking-widest">Generation Failed</p>
                            {onRetry && (
                                <button onClick={() => onRetry(image.index)} className="mt-4 px-4 py-2 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full hover:bg-red-500/20 flex items-center gap-2 uppercase tracking-widest transition-colors">
                                    <ArrowPathIcon className="w-3.5 h-3.5"/> Retry Node
                                </button>
                            )}
                        </div>
                    );
                }

                return (
                    <div key={image.image_url || index} className="relative group hover:scale-[1.03] transition-all duration-700 ease-out z-0 hover:z-10">
                        {image.video_url ? (
                            <div className="aspect-square rounded-2xl overflow-hidden border border-white/10 dark:border-white/5 bg-[#0D0B0A] shadow-xl group-hover:shadow-blue-500/10 transition-all">
                                <video src={image.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                <span className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-[0.2em] backdrop-blur-md shadow-lg">Living Portrait</span>
                            </div>
                        ) : (
                            <StoryImage 
                                src={isPending ? 'generating' : image.image_url} 
                                alt={image.prompt}
                                provider={image.provider}
                                scene={image.scene}
                            />
                        )}
                        
                        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-[-10px] group-hover:translate-y-0 z-20">
                            {!image.video_url && !isPending && onAnimate && (
                                <button 
                                    onClick={() => onAnimate(image.index, image.image_url)}
                                    disabled={animatingIndex === image.index}
                                    className="p-2.5 bg-black/60 hover:bg-gemynd-oxblood text-white rounded-xl backdrop-blur-md transition-all transform hover:scale-110 disabled:opacity-100 disabled:bg-gemynd-oxblood/80 shadow-2xl border border-white/10"
                                    title="Generate Living Portrait"
                                >
                                    {animatingIndex === image.index ? (
                                        <div className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></div>
                                    ) : (
                                        <VideoCameraIcon className="w-5 h-5" />
                                    )}
                                </button>
                            )}
                            {!isPending && (
                                <button 
                                    onClick={() => setEditingIndex(image.index)}
                                    className="p-2.5 bg-black/60 hover:bg-gemynd-agedGold text-black hover:text-black rounded-xl backdrop-blur-md transition-all transform hover:scale-110 shadow-2xl border border-white/10"
                                    title="Edit Artisan DNA"
                                >
                                    <WandIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Artisan Edit Modal */}
            {editingIndex !== null && (
                <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade-in" onClick={() => setEditingIndex(null)}>
                    <div className="bg-[#0D0B0A] border border-white/10 rounded-[3.5rem] w-full max-w-xl overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)]" onClick={e => e.stopPropagation()}>
                        <div className="p-10 border-b border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gemynd-agedGold/20 rounded-2xl border border-gemynd-agedGold/30">
                                    <WandIcon className="w-6 h-6 text-gemynd-agedGold" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-display font-black text-white tracking-tighter">Artisan Refinement</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1">Direct Scene Modification</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingIndex(null)} className="p-2 hover:bg-white/10 rounded-full text-white/30 transition-colors"><XMarkIcon className="w-7 h-7" /></button>
                        </div>
                        <div className="p-12">
                            <div className="aspect-video rounded-[2.5rem] overflow-hidden mb-10 border border-white/10 shadow-2xl bg-black">
                                <img 
                                    src={images.find(img => img.index === editingIndex)?.image_url} 
                                    className="w-full h-full object-cover" 
                                    alt="Source" 
                                />
                            </div>
                            <form onSubmit={handleEdit} className="space-y-10">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gemynd-agedGold/60 uppercase tracking-[0.4em] ml-2">Revision Directive</label>
                                    <input 
                                        type="text" 
                                        value={editPrompt}
                                        onChange={(e) => setEditPrompt(e.target.value)}
                                        placeholder="e.g., Change to cinematic oil painting..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white text-lg focus:ring-2 focus:ring-gemynd-agedGold/20 outline-none transition-all placeholder:text-white/10 font-serif italic"
                                        autoFocus
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={!editPrompt.trim() || isProcessingEdit}
                                    className="w-full py-6 bg-gemynd-oxblood hover:bg-gemynd-red text-white font-black rounded-2xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-4 shadow-2xl text-xs uppercase tracking-[0.4em]"
                                >
                                    {isProcessingEdit ? (
                                        <>
                                            <div className="animate-spin h-5 w-5 border-3 border-white/20 border-t-white rounded-full"></div>
                                            Rewriting Vision...
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-5 h-5" />
                                            Update Artifact
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageGallery;