import React, { useEffect } from 'react';

// FIX: Added 'warn' to the type definition to support warning toasts from App.tsx.
const Toast: React.FC<{message: string, type: 'success' | 'error' | 'warn', onClose: () => void}> = ({message, type, onClose}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-[100] ${
      // FIX: Added background color for the 'warn' type.
      type === 'success' ? 'bg-green-600' : type === 'warn' ? 'bg-amber-500' : 'bg-red-600'
    } text-white flex items-center gap-3 animate-fade-in-down`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20">&times;</button>
       <style>{`
        @keyframes fade-in-down {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Toast;
