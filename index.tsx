import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

// Service worker registration intentionally disabled.
// AI Studio's _service-worker.js proxy intercepts Gemini API calls
// and causes 403 errors when the baked-in key is stale.
// PWA / offline support can be re-enabled once voice is stable.

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
