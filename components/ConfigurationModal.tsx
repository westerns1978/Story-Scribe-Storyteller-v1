
import React, { useState, useEffect } from 'react';
import { ConnectivitySettings, HealthCheckResponse } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import { testBackendConnection, DEFAULT_BACKEND_URL } from '../services/connectivityService';

interface ConfigurationModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: ConnectivitySettings;
    onSave: (settings: ConnectivitySettings) => void;
    initialWarning?: string;
}

const ConfigurationModal: React.FC<ConfigurationModalProps> = ({ isOpen, onClose, currentSettings, onSave, initialWarning }) => {
    const [settings, setSettings] = useState<ConnectivitySettings>(currentSettings);
    const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [detailedError, setDetailedError] = useState<string | null>(null);
    const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSettings(currentSettings);
            if (initialWarning) {
                setStatus('error');
                setStatusMessage(initialWarning);
            } else {
                handleTestConnection(); // Auto-test on open
            }
        }
    }, [isOpen, currentSettings, initialWarning]);

    const handleTestConnection = async () => {
        setStatus('testing');
        setStatusMessage('');
        setDetailedError(null);
        setHealthData(null);
        try {
            // Test specifically the URL currently in the input field, not just saved settings
            const testUrl = settings.backendUrl.replace(/\/$/, ''); // Remove trailing slash
            console.log("Testing URL:", testUrl);
            
            const response = await fetch(`${testUrl}/health`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) {
                 const text = await response.text().catch(() => 'No response body');
                 throw new Error(`HTTP ${response.status}: ${response.statusText} \nDetails: ${text.substring(0, 100)}`);
            }
            
            const data = await response.json();
            
            setStatus('success');
            setHealthData(data);
            setStatusMessage(`Connected: v${data.version}`);
        } catch (error: any) {
            setStatus('error');
            setStatusMessage('Connection Failed');
            
            // Generate detailed diagnostic message
            let diag = error.message;
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                diag = "Network Error (CORS or Server Down).\n\n1. Check if Server is running.\n2. Verify 'allow_origins' in app.py.\n3. Ensure URL starts with https://";
            }
            setDetailedError(diag);
        }
    };
    
    const handleReset = () => {
        setSettings({
            ...settings,
            backendUrl: DEFAULT_BACKEND_URL
        });
        setStatus('idle');
        setStatusMessage('Settings reset to default. Click Test to verify.');
        setDetailedError(null);
    };

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(settings);
    };

    const StatusIndicator: React.FC = () => {
        if (status === 'idle') return null;
        let color = 'text-slate-500';
        if (status === 'success') color = 'text-green-500';
        if (status === 'error') color = 'text-red-500';

        return (
             <div className={`text-xs mt-2 p-3 rounded-md border ${
                status === 'success' ? 'bg-green-500/10 border-green-500/20' : 
                status === 'error' ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-500/10 border-slate-500/20'
             }`}>
                <div className="flex items-center gap-2">
                    {status === 'testing' && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin text-slate-500"/>}
                    <p className={`font-semibold ${color}`}>{statusMessage}</p>
                </div>
                
                {status === 'success' && healthData && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <div>Gemini: <span className={healthData.gemini === 'configured' ? 'text-green-500' : 'text-slate-400'}>{healthData.gemini || 'Unknown'}</span></div>
                        <div>Supabase: <span className={healthData.supabase === 'connected' ? 'text-green-500' : 'text-slate-400'}>{healthData.supabase || 'Unknown'}</span></div>
                    </div>
                )}
                
                {/* Detailed Error Display */}
                {detailedError && (
                    <div className="mt-2 p-2 bg-black/10 rounded font-mono text-[10px] text-red-600 dark:text-red-300 whitespace-pre-wrap">
                        {detailedError}
                    </div>
                )}

                {healthData?.providers_registered && (
                    <div className="mt-2">
                        <p className="font-semibold text-slate-600 dark:text-slate-300">Registered Providers:</p>
                        <ul className="list-disc list-inside text-slate-500 dark:text-slate-400">
                            {healthData.providers_registered.map(p => <li key={p}>{p}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-2xl w-full max-w-lg rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700/50">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configuration</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Close modal">
                        <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                     <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="backendUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Backend Server URL</label>
                            <button onClick={handleReset} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                <ArrowPathIcon className="w-3 h-3" /> Reset to Default
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                id="backendUrl"
                                name="backendUrl"
                                type="text"
                                value={settings.backendUrl}
                                onChange={(e) => setSettings({ ...settings, backendUrl: e.target.value })}
                                className="w-full bg-white/50 dark:bg-slate-950/50 border border-slate-300/50 dark:border-slate-700/50 rounded-lg px-3 py-2 text-sm"
                            />
                            <button onClick={handleTestConnection} disabled={status === 'testing'} className="px-4 py-2 text-sm font-medium bg-white/80 dark:bg-slate-800/80 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 border border-slate-200 dark:border-slate-600">
                                Test
                            </button>
                        </div>
                        <StatusIndicator />
                    </div>
                     <div>
                        <label htmlFor="pixabayApiKey" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Pixabay API Key</label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Optional key for searching background music.</p>
                        <input
                            id="pixabayApiKey"
                            name="pixabayApiKey"
                            type="password"
                            value={settings.pixabayApiKey}
                            onChange={(e) => setSettings({ ...settings, pixabayApiKey: e.target.value })}
                            className="w-full bg-white/50 dark:bg-slate-950/50 border border-slate-300/50 dark:border-slate-700/50 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                </div>

                <div className="flex justify-end items-center p-4 border-t border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300/50 dark:hover:bg-slate-700/50 rounded-lg mr-2">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default ConfigurationModal;
