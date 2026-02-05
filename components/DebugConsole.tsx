import React, { useState, useEffect } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warn';
  message: string;
  data?: any;
}

export const DebugConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Expose global logging function
  useEffect(() => {
    (window as any).appLog = (level: string, message: string, data?: any) => {
      setLogs(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        level: level as any,
        message,
        data
      }].slice(-100)); // Keep last 100 logs
    };
    
    // Cleanup on unmount
    return () => {
        delete (window as any).appLog;
    }
  }, []);

  const levelColors = {
    info: 'text-blue-400',
    success: 'text-green-400',
    error: 'text-red-400',
    warn: 'text-yellow-400'
  };

  return (
    <>
      {/* Toggle Button (bottom right) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 p-3 bg-slate-700 hover:bg-slate-600 rounded-full shadow-lg z-50 transition-transform hover:scale-110"
        aria-label="Toggle Debug Console"
      >
        <svg className="w-6 h-6 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Console Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 h-96 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 flex flex-col animate-fade-in-up">
          <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
            <h3 className="text-sm font-semibold text-slate-200">Debug Console</h3>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-slate-500 flex-shrink-0">{log.timestamp}</span>
                <span className={`${levelColors[log.level]} font-bold flex-shrink-0`}>{log.level.toUpperCase()}</span>
                <span className="text-slate-300 flex-grow whitespace-pre-wrap break-words">{log.message}</span>
                {log.data && (
                  <details className="text-slate-400 flex-shrink-0">
                    <summary className="cursor-pointer">data</summary>
                    <pre className="pl-2 mt-1 text-slate-500">{JSON.stringify(log.data, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))}
             <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
          </div>
        </div>
      )}
      <style>{`
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};
