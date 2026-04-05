
import { ConnectivitySettings, HealthCheckResponse } from '../types';

// UPDATED: Bump version to force reset of local settings to the correct default
const SETTINGS_KEY = 'memory-scribe-settings-v20-prod'; 
// Set the PROVEN working backend URL
export const DEFAULT_BACKEND_URL = 'https://wissums-backend-286939318734.us-central1.run.app';

export const getConnectivitySettings = (): ConnectivitySettings => {
    try {
        const storedSettings = localStorage.getItem(SETTINGS_KEY);
        if (storedSettings) {
            const settings = JSON.parse(storedSettings);
            return {
                backendUrl: settings.backendUrl || DEFAULT_BACKEND_URL,
                pixabayApiKey: settings.pixabayApiKey || '2313970-7891e11fb80709229e6e799f9',
            };
        }
    } catch (error) {
        console.error("Failed to parse connectivity settings:", error);
    }
    
    // Default fallback if storage is empty or invalid
    return {
        backendUrl: DEFAULT_BACKEND_URL,
        pixabayApiKey: '2313970-7891e11fb80709229e6e799f9',
    };
};

export const saveConnectivitySettings = (settings: ConnectivitySettings): void => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save settings:", error);
    }
};

export const testBackendConnection = async (): Promise<HealthCheckResponse> => {
    try {
        const settings = getConnectivitySettings();
        console.log("Testing connection to:", settings.backendUrl);
        
        // Remove trailing slash for consistency
        const baseUrl = settings.backendUrl.replace(/\/$/, '');
        
        const response = await fetch(`${baseUrl}/health`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
             throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const healthData = await response.json();
        return healthData as HealthCheckResponse;
    } catch (error) {
        console.error('Backend connection test failed:', error);
        if (error instanceof Error) throw error;
        throw new Error('Network error. Could not reach the backend server.');
    }
};
