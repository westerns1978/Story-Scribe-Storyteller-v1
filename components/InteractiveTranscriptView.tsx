import React, { useRef } from 'react';
import { TranscriptSegment } from '../types';
import PlayCircleIcon from './icons/PlayCircleIcon';

const InteractiveTranscriptView: React.FC<{ recordingUrl: string; segments: TranscriptSegment[] }> = ({ recordingUrl, segments }) => {
    const audioRef = useRef<HTMLAudioElement>(null);

    const handleSeekAudio = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            audioRef.current.play();
        }
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                <audio ref={audioRef} src={recordingUrl} controls className="w-full" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {segments.map((seg, i) => (
                    <div key={i} className="group flex items-start gap-3 p-2 rounded-lg hover:bg-brand-500/10 dark:hover:bg-brand-500/20">
                        <button onClick={() => handleSeekAudio(seg.startTime)} className="text-brand-500 hover:text-brand-400 mt-0.5">
                            <PlayCircleIcon className="w-6 h-6" />
                        </button>
                        <div>
                            <p className="font-mono text-xs text-brand-400">{new Date(seg.startTime * 1000).toISOString().substr(14, 5)}</p>
                            <p className="text-slate-700 dark:text-slate-200">{seg.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InteractiveTranscriptView;