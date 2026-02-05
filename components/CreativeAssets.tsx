
import React, { useState } from 'react';
import { ActiveStory, StatusTracker, ProviderStat } from '../types';
import ImageIcon from './icons/ImageIcon';
import ClapperboardIcon from './icons/ClapperboardIcon';
import WriteIcon from './icons/WriteIcon';
import ImageGallery from './ImageGallery';
import SpeakerWaveIcon from './icons/SpeakerWaveIcon';
import AuroraVisualsDisplay from './AuroraVisualsDisplay';
import MusicNoteIcon from './icons/MusicNoteIcon';

// New Stats Component
const ImageGenerationStats: React.FC<{ stats: ProviderStat[] | null, totalCost: number }> = ({ stats, totalCost }) => {
    if (!stats) return null;

    return (
        <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 text-xs">
            <div className="flex justify-between items-center mb-2">
                <h5 className="font-semibold text-slate-300">Generation Report</h5>
                <p className="font-bold text-green-400">Total Cost: ${totalCost.toFixed(4)}</p>
            </div>
            <div className="space-y-1">
                {stats.map(stat => (
                    <div key={stat.name} className="flex justify-between items-center text-slate-400">
                        <span>{stat.name}:</span>
                        <span className="font-mono">{stat.success} success, {stat.failures} fail</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


interface CreativeAssetsProps {
    activeStory: ActiveStory;
    status: StatusTracker;
    imageGenerationProgress: string | null;
    videoGenerationProgress: number | null;
    onGenerateNarrative: () => void;
    isGeneratingNarrative: boolean;
    onGenerateImages: (style: string, mood?: string) => void;
    onOpenDirectorsCut: () => void;
    generationStats: ProviderStat[] | null;
    totalCost: number;
    onRetryImage: (index: number) => void;
    onAnimateImage: (index: number, imageUrl: string) => void;
    animatingImageIndex: number | null;
    credits: number;
    onGeneratePodcast?: () => void;
    isGeneratingPodcast?: boolean;
    podcastAudioUrl?: string | null;
    onOpenMusicFinder: () => void;
    onImageUpdated?: (index: number, newUrl: string) => void;
}

const CreativeAssets: React.FC<CreativeAssetsProps> = ({
    activeStory,
    status,
    imageGenerationProgress,
    videoGenerationProgress,
    onGenerateNarrative,
    isGeneratingNarrative,
    onGenerateImages,
    onOpenDirectorsCut,
    generationStats,
    totalCost,
    onRetryImage,
    onAnimateImage,
    animatingImageIndex,
    credits,
    onGeneratePodcast,
    isGeneratingPodcast,
    podcastAudioUrl,
    onOpenMusicFinder,
    onImageUpdated
}) => {
    const [visualStyle, setVisualStyle] = useState('Aurora Scanline');
    
    const isProcessing = Object.values(status).some(s => s) || isGeneratingNarrative || isGeneratingPodcast;
    const hasGeneratedImages = activeStory.generatedImages && activeStory.generatedImages.length > 0;

    const Button: React.FC<{
        onClick?: () => void;
        isProcessing: boolean;
        processingText: string;
        label: string;
        icon: React.ReactNode;
        disabled?: boolean;
        title?: string;
    }> = ({ onClick, isProcessing, processingText, label, icon, disabled, title }) => {
        const isVideo = label === "Generate Video";
        const currentProgress = isVideo ? videoGenerationProgress : null;

        return (
            <button
                onClick={onClick}
                disabled={isProcessing || disabled}
                title={title}
                className="relative flex flex-col items-center justify-center gap-3 text-center p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
            >
                {isVideo && isProcessing && typeof currentProgress === 'number' && (
                    <div 
                        className="absolute top-0 left-0 h-full bg-blue-600/50 transition-all duration-500 ease-out" 
                        style={{ width: `${currentProgress}%` }}
                    />
                )}
                <div className="relative z-10 flex flex-col items-center justify-center gap-3 text-center">
                    <div className={`p-3 rounded-full bg-slate-600/80 group-hover:bg-blue-600 transition-colors ${isProcessing && 'animate-pulse'}`}>
                        {icon}
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-slate-200">{isProcessing ? processingText : label}</p>
                        <p className="text-xs text-slate-400 mt-1">
                            {label === "Generate Narrative" && "(Step 1)"}
                            {label === "Generate Images" && "(Step 2)"}
                            {label === "Director's Cut" && (disabled ? "Requires storyboard" : "Cinematic view")}
                            {label === "Memory Cast" && "Podcast"}
                        </p>
                    </div>
                </div>
            </button>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <Button
                        onClick={onGenerateNarrative}
                        isProcessing={isGeneratingNarrative}
                        label="Generate Narrative"
                        processingText="Generating..."
                        icon={<WriteIcon className="w-6 h-6 text-slate-300" />}
                        disabled={!!activeStory.narrative || isProcessing}
                        title={activeStory.narrative ? "Narrative has been generated" : "Generate the story narrative"}
                    />
                    <Button
                        onClick={() => onGenerateImages(visualStyle)}
                        isProcessing={status.generatingImages}
                        label="Generate Images"
                        processingText={imageGenerationProgress || "Generating..."}
                        icon={<ImageIcon className="w-6 h-6 text-slate-300" />}
                        disabled={!activeStory.narrative || hasGeneratedImages || isProcessing}
                        title={!activeStory.narrative ? "Generate a narrative first" : hasGeneratedImages ? "Images have already been generated" : "Generate images for your story"}
                    />
                    <Button
                        onClick={onOpenDirectorsCut}
                        isProcessing={false} // This is a client-side action
                        label="Director's Cut"
                        processingText=""
                        icon={<ClapperboardIcon className="w-6 h-6 text-slate-300" />}
                        disabled={!activeStory.storyboard || !activeStory.storyboard.story_beats || activeStory.storyboard.story_beats.length === 0}
                        title={!activeStory.storyboard || !activeStory.storyboard.story_beats || activeStory.storyboard.story_beats.length === 0 ? "Requires a generated storyboard" : "View cinematic story"}
                    />
                    {onGeneratePodcast && (
                        <Button
                            onClick={onGeneratePodcast}
                            isProcessing={!!isGeneratingPodcast}
                            label="Memory Cast"
                            processingText="Recording..."
                            icon={<SpeakerWaveIcon className="w-6 h-6 text-slate-300" />}
                            disabled={!activeStory.narrative || isProcessing}
                            title="Generate an AI podcast conversation about this story"
                        />
                    )}
                     
                     {/* Visual Style Selector */}
                    <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600/50 flex flex-col justify-center">
                        <label className="text-xs font-semibold text-slate-400 mb-2 block">Visual Style</label>
                        <select 
                            value={visualStyle} 
                            onChange={(e) => setVisualStyle(e.target.value)}
                            disabled={hasGeneratedImages}
                            className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                        >
                            <option value="Aurora Scanline">Aurora Scanline (Cinematic)</option>
                            <option value="Ink Masterpiece">Ink Masterpiece (Pen & Ink)</option>
                            <option value="Coffee Relief">Coffee Relief (Latte Art)</option>
                            <option value="Istanbul Nostalgia">Istanbul Nostalgia (Ara Güler)</option>
                            <option value="Cloud Scape">Cloud Scape (Sky Art)</option>
                            <option value="Realistic">Photorealistic</option>
                            <option value="Watercolor">Watercolor</option>
                        </select>
                    </div>

                    {/* Background Music Button */}
                    <button
                        onClick={onOpenMusicFinder}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-xl transition-all group"
                    >
                        <div className="p-3 rounded-full bg-slate-600/80 group-hover:bg-amber-600 transition-colors">
                            <MusicNoteIcon className="w-6 h-6 text-slate-300" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-slate-200">Set Ambiance</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">
                                {activeStory.background_music_url ? "Track Linked" : "Find Music"}
                            </p>
                        </div>
                    </button>
                </div>
                <ImageGenerationStats stats={generationStats} totalCost={totalCost} />
                
                {podcastAudioUrl && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-xl border border-indigo-500/30">
                        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                            <SpeakerWaveIcon className="w-4 h-4 text-indigo-400" /> Memory Cast (Podcast)
                        </h4>
                        <audio controls src={podcastAudioUrl} className="w-full h-10" />
                    </div>
                )}
            </div>

            {/* Aurora Visuals Section */}
            {activeStory.aurora_prompts && activeStory.aurora_prompts.length > 0 && (
                <AuroraVisualsDisplay prompts={activeStory.aurora_prompts} />
            )}

            {/* Generated Images Section */}
            {activeStory.generatedImages && activeStory.generatedImages.length > 0 && (
                <div>
                    <h4 className="font-semibold text-slate-200 mb-3 text-lg">Generated Images</h4>
                    <ImageGallery 
                        images={activeStory.generatedImages} 
                        onRetry={onRetryImage}
                        onAnimate={onAnimateImage}
                        animatingIndex={animatingImageIndex}
                        onImageUpdated={onImageUpdated}
                    />
                </div>
            )}
            
            {/* Generated Video Section */}
            {activeStory.videoUrl && (
                 <div>
                    <h4 className="font-semibold text-slate-200 mb-3 text-lg">Generated Scene</h4>
                    <div className="rounded-lg overflow-hidden border border-slate-700 bg-black">
                        <video
                            key={activeStory.videoUrl} // Add key to force re-render on URL change
                            src={activeStory.videoUrl}
                            controls
                            className="w-full aspect-video"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreativeAssets;
