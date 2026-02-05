import React, { useState } from 'react';
import { MusicTrack } from '../types';
import { findMusicFromSuggestion } from '../services/musicService';

interface MusicFinderProps {
    suggestion: string;
}

const MusicFinder: React.FC<MusicFinderProps> = ({ suggestion }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tracks, setTracks] = useState<MusicTrack[]>([]);

    const handleSearch = async () => {
        setIsLoading(true);
        setError(null);
        setTracks([]);
        try {
            const results = await findMusicFromSuggestion(suggestion);
            setTracks(results);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to find music.");
        } finally {
            setIsLoading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div>
            <div className="flex justify-between items-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm">Music Suggestion:</p>
                <button 
                    onClick={handleSearch} 
                    disabled={isLoading}
                    className="px-3 py-1 text-xs font-semibold text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50"
                >
                    {isLoading ? 'Searching...' : 'Find Music'}
                </button>
            </div>
            <p className="font-medium text-slate-800 dark:text-slate-200 text-sm italic">"{suggestion}"</p>
            
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            
            {tracks.length > 0 && (
                <div className="mt-3 space-y-2">
                    {tracks.map(track => (
                        <div key={track.id} className="p-2 bg-white/50 dark:bg-slate-900/50 rounded-md">
                           <div className="flex justify-between items-center mb-1">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-2">{track.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{formatDuration(track.duration)}</p>
                           </div>
                            <audio src={track.url} controls className="w-full h-8" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MusicFinder;
