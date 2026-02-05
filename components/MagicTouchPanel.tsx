
import React from 'react';
import WandIcon from './icons/WandIcon';

interface MagicTouchPanelProps {
    onRefine: (instruction: string) => void;
    isProcessing: boolean;
}

const MagicTouchPanel: React.FC<MagicTouchPanelProps> = ({ onRefine, isProcessing }) => {
    const refinementOptions = [
        { label: "💫 Make it more emotional", instruction: "Rewrite the narrative to be more emotional, focusing on the storyteller's feelings and inner thoughts." },
        { label: "📚 Add more detail", instruction: "Expand on the narrative, adding more descriptive details, embellishments, and context to flesh out the story." },
        { label: "⚡ Make it more concise", instruction: "Rewrite the narrative to be more concise and to the point, removing any unnecessary words or sentences." },
        { label: "🎭 Make it more dramatic", instruction: "Rewrite the narrative with a more dramatic and engaging tone. Use stronger verbs and more vivid imagery to heighten the impact." },
        { label: "🌟 Add more sensory details", instruction: "Rewrite the narrative to include more sensory details, focusing on sights, sounds, smells, tastes, and textures." },
    ];

    return (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <WandIcon className="w-5 h-5 text-violet-400" />
                Magic Touch
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {refinementOptions.map(option => (
                    <button
                        key={option.label}
                        onClick={() => onRefine(option.instruction)}
                        disabled={isProcessing}
                        className="w-full text-left px-3 py-2 text-sm text-slate-300 bg-slate-700/50 rounded-lg hover:bg-slate-700/80 hover:text-white disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isProcessing ? 'Applying...' : option.label}
                    </button>
                ))}
            </div>
             {isProcessing && (
                <div className="w-full bg-slate-700/50 rounded-full h-1 mt-3 overflow-hidden">
                    <div className="bg-violet-500 h-1 rounded-full animate-magic-progress"></div>
                </div>
            )}
            <style>{`
                @keyframes magic-progress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-magic-progress {
                    animation: magic-progress 1.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default MagicTouchPanel;
