import React from 'react';

// Type definitions for the Web Speech API are retained to prevent type conflicts
// in other components (like ConnieChatWidget) that might have different global declarations.
interface SpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onresult: (event: any) => void;
    onerror: (event: any) => void;
    onend: () => void;
    onstart: () => void;
}
declare var SpeechRecognition: { new(): SpeechRecognition };
declare var webkitSpeechRecognition: { new(): SpeechRecognition };
declare global {
    interface Window {
        SpeechRecognition: typeof SpeechRecognition;
        webkitSpeechRecognition: typeof webkitSpeechRecognition;
    }
}

// This component is now deprecated and its functionality is removed.
// It is kept to avoid breaking imports and to house the shared type definitions above.
const VoiceInputModal: React.FC = () => {
    return null;
};

export default VoiceInputModal;
