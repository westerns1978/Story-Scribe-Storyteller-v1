import React from 'react';
import VideoCameraIcon from './icons/VideoCameraIcon';

interface VideoPromptCardsProps {
  prompts: string[];
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  credits?: number;
}

const VideoPromptCards: React.FC<VideoPromptCardsProps> = ({ prompts, onGenerate, isGenerating, credits }) => {
  return (
    <div>
      <h3 className="text-xl font-semibold font-serif text-slate-200 mb-4">Cinematic Scene Prompts</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {prompts.map((prompt, index) => (
          <div key={index} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col justify-between">
            <p className="text-sm text-slate-300 italic mb-4">"{prompt}"</p>
            <button
              onClick={() => onGenerate(prompt)}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <VideoCameraIcon className="w-4 h-4" />
              Generate Scene
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoPromptCards;