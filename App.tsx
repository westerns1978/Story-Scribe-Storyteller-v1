import React, { useState } from 'react';
import { useUserRole } from './hooks/useUserRole';
import { AdminLayout } from './layouts/AdminLayout';
import { StorytellerLayout } from './layouts/StorytellerLayout';
import LoginView from './components/LoginView';
import ErrorBoundary from './components/ErrorBoundary';
import { Customer } from './types';

const App: React.FC = () => {
  const { role, setRole, subjectName, logout } = useUserRole();
  const [customer, setCustomer] = useState<Customer | null>(() => {
      const saved = localStorage.getItem('storyscribe_customer');
      return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (c: Customer) => {
    setCustomer(c);
    // Main door login defaults to admin for this system's architecture
    setRole(c.is_admin ? 'admin' : 'storyteller');
  };

  const handleLogout = () => {
    setCustomer(null);
    logout();
  };

  // Direct detection for Guest Storyteller mode via URL parameters or path
  const params = new URLSearchParams(window.location.search);
  const isGuestStorytellerURL = params.get('mode') === 'storyteller' || window.location.pathname === '/remember';

  return (
    <ErrorBoundary>
      {/* 
        LOGIC BRANCH 1: Guest Storyteller Mode
        Triggered by ?mode=storyteller or /remember.
        Requires zero authentication.
      */}
      {isGuestStorytellerURL ? (
        <StorytellerLayout initialSubject={subjectName} onLogout={handleLogout} />
      ) : (
        /* 
          LOGIC BRANCH 2 & 3: Gated Area
          Requires a valid session (localStorage/LoginView).
        */
        customer ? (
          /* User is authenticated. Route based on verified role. */
          role === 'admin' ? (
            <AdminLayout customer={customer} onLogout={handleLogout} />
          ) : (
            <StorytellerLayout initialSubject={subjectName} onLogout={handleLogout} />
          )
        ) : (
          /* User is NOT authenticated and NO guest trigger present -> FORCE LOGIN */
          <LoginView onLogin={handleLogin} />
        )
      )}
    </ErrorBoundary>
  );
}

export default App;
