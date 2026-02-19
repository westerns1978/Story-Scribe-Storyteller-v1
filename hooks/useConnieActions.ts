
import { useEffect } from 'react';
import { enableElderlyMode, disableElderlyMode } from '../utils/accessibility';

interface ToolCallDetail {
    name: string;
    args: Record<string, any>;
}

export function useConnieActions(callbacks: {
    onNavigate: (dest: string) => void;
    onCapturePhoto: () => void;
    onCreateStory: (subject?: string) => void;
}) {
    useEffect(() => {
        const handleToolCall = (e: any) => {
            const { name, args } = e.detail as ToolCallDetail;
            
            switch (name) {
                case 'navigate':
                    if (args.destination) callbacks.onNavigate(args.destination);
                    break;
                case 'capture_photo':
                    callbacks.onCapturePhoto();
                    break;
                case 'create_story':
                    callbacks.onCreateStory(args.subjectName);
                    break;
                case 'adjust_ui':
                    if (args.largeText) enableElderlyMode();
                    else disableElderlyMode();
                    break;
            }
        };

        window.addEventListener('connie-tool-call', handleToolCall);
        return () => window.removeEventListener('connie-tool-call', handleToolCall);
    }, [callbacks]);
}
