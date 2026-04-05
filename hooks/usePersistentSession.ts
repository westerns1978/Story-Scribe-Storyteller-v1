import { useState, useCallback } from 'react';

const SESSION_KEY = 'wissums_secure_session';

export const usePersistentSession = () => {
    const [user, setUser] = useState(() => {
        if (typeof window === 'undefined') return null;
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (!saved) return null;
        try { 
            return JSON.parse(saved); 
        } catch { 
            return null; 
        }
    });

    const isAuthenticated = !!user;

    const login = useCallback((userData: any) => {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
        // Keep existing localStorage for background persistence if needed by other components
        localStorage.setItem('storyscribe_auth', JSON.stringify(userData));
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('storyscribe_auth');
        setUser(null);
    }, []);

    return { isAuthenticated, user, login, logout };
};