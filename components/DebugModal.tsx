
import React, { useState, useEffect } from 'react';
import XMarkIcon from './icons/XMarkIcon';
import { loggingService, LogEntry, LogLevel } from '../services/loggingService';
import { BackendTest } from './BackendTest';

interface DebugModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
    title?: string;
}

type Tab = 'state' | 'logs' | 'backend';

const getLogLevelClass = (level: LogLevel) => {
    switch (level) {
        case 'error': return 'text-red-500 bg-red-500/10';
        case 'warn': return 'text-amber-500 bg-amber-500/10';
        default: return 'text-slate-600 dark:text-slate-300';
    }
};

const LogViewer: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);

    useEffect(() => {
        setLogs(loggingService.getLogs().reverse()); // Show newest first
    }, []);

    return (
        <div className="text-xs font-mono space-y-2">
            {logs.map((log, index) => (
                <div key={index} className={`p-2 rounded-md ${getLogLevelClass(log.level)}`}>
                    <div className="flex justify-between items-center">
                        <span className="font-bold uppercase">{log.level}</span>
                        <span className="text-slate-400">{log.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-all mt-1">{log.message}</p>
                    {log.data && (
                         <pre className="mt-2 p-2 bg-black/10 dark:bg-black/20 rounded text-xs whitespace-pre-wrap break-all">
                            {JSON.stringify(log.data, null, 2)}
                        </pre>
                    )}
                </div>
            ))}
        </div>
    );
}


const DebugModal: React.FC<DebugModalProps> = ({ isOpen, onClose, data, title = "Debug View" }) => {
    const [activeTab, setActiveTab] = useState<Tab>('backend');

    if (!isOpen) return null;
    
    const TabButton: React.FC<{tab: Tab, label: string}> = ({ tab, label }) => (
         <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-brand-600 text-white' : 'bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300/50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}
        >
            {label}
        </button>
    )

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-2xl w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 flex flex-col relative"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Close modal"
                    >
                        <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </button>
                </div>
                
                <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0 flex items-center gap-2">
                    <TabButton tab="backend" label="Backend Lab 🧪" />
                    <TabButton tab="state" label="App State" />
                    <TabButton tab="logs" label="Logs" />
                </div>


                <div className="flex-1 overflow-y-auto p-6">
                   {activeTab === 'backend' && <BackendTest />}
                   {activeTab === 'state' && (
                        <pre className="text-xs bg-white/50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                   )}
                   {activeTab === 'logs' && <LogViewer />}
                </div>
            </div>
        </div>
    );
};

export default DebugModal;
