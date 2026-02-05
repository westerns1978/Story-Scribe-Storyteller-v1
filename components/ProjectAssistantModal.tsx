import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import XMarkIcon from './icons/XMarkIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import HelpDeskIcon from './icons/HelpDeskIcon';

interface Message {
    role: 'user' | 'model';
    text: string;
}

interface ProjectAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProjectAssistantModal: React.FC<ProjectAssistantModalProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: "Hello! I am Guide, your AI Research Assistant. Ask me anything about the Memory Scribe project." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if(isOpen) {
            // Reset state when opening
            setMessages([ { role: 'model', text: "Hello! I am Guide, your AI Research Assistant. Ask me anything about the Memory Scribe project." } ]);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);
    
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', text: input.trim() };
        const currentMessages = [...messages, userMessage];
        setMessages(currentMessages);
        setInput('');
        setIsLoading(true);
        
        setMessages(prev => [...prev, { role: 'model', text: '' }]);

        try {
            const historyForBackend = currentMessages.slice(1).map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            }));

            const stream = await chatService.sendMessageAndStreamResponse(userMessage.text, historyForBackend);
            const reader = stream.getReader();
            const decoder = new TextDecoder();

            let done = false;
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunkText = decoder.decode(value, { stream: true });
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.role === 'model') {
                            lastMessage.text += chunkText;
                        }
                        return newMessages;
                    });
                }
            }

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === 'model') {
                    lastMessage.text = `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Please check the backend connection.'}`;
                }
                return newMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-2xl w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2"><HelpDeskIcon /> Project Assistant</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="Close chat">
                        <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </button>
                </header>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-4 py-2 rounded-xl ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.text || <span className="inline-block w-2 h-4 bg-slate-500 animate-pulse rounded-full"></span>}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <footer className="p-4 border-t border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about project goals, business model, scripts..."
                            className="w-full bg-white/50 dark:bg-slate-950/50 border border-slate-300/50 dark:border-slate-700/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()} className="p-2.5 bg-brand-600 text-white rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-600 hover:bg-brand-700 transition-colors">
                            {isLoading ? 
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> :
                                <PaperAirplaneIcon className="w-5 h-5" />
                            }
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};

export default ProjectAssistantModal;