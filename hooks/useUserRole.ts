import { useState, useCallback } from 'react';

export type UserRole = 'admin' | 'storyteller';

export function useUserRole() {
  const [role, setRoleState] = useState<UserRole | null>(() => {
    try {
      // 1. Immediate synchronous detection for guest mode
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode');
      if (modeParam === 'storyteller' || window.location.pathname === '/remember') {
        return 'storyteller';
      }

      // 2. Check for existing session-based role
      const savedUser = localStorage.getItem('storyscribe_user');
      if (savedUser) {
        try {
          const data = JSON.parse(savedUser);
          if (data && typeof data === 'object' && data.role) {
            return data.role;
          }
        } catch (e) {
          // If it's a simple string like "admin", JSON.parse fails. Handle it.
          if (savedUser === 'admin' || savedUser === 'storyteller') {
            return savedUser as UserRole;
          }
        }
      }
      
      // 3. Fallback to legacy customer object
      const legacyCustomer = localStorage.getItem('storyscribe_customer');
      if (legacyCustomer) {
        const data = JSON.parse(legacyCustomer);
        return data.is_admin ? 'admin' : 'storyteller';
      }
    } catch (err) {
      console.error("[RoleHook] Initialization Error:", err);
    }
    return null;
  });

  const [subjectName, setSubjectNameState] = useState<string>(() => {
    return localStorage.getItem('storyscribe_subject') || '';
  });

  const setRole = useCallback((newRole: UserRole | null) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem('storyscribe_user', JSON.stringify({ role: newRole }));
    } else {
      localStorage.removeItem('storyscribe_user');
    }
  }, []);

  const saveSubject = useCallback((name: string) => {
    setSubjectNameState(name);
    localStorage.setItem('storyscribe_subject', name);
  }, []);

  const logout = useCallback(() => {
    setRoleState(null);
    setSubjectNameState('');
    localStorage.removeItem('storyscribe_subject');
    localStorage.removeItem('storyscribe_user');
    localStorage.removeItem('storyscribe_customer');
    sessionStorage.removeItem('flowview_auth');
    window.history.replaceState({}, document.title, "/");
  }, []);

  return { role, setRole, subjectName, saveSubject, logout };
}
