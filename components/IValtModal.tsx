import React, { useState, useRef, useEffect } from 'react';
import { IValtService, IValtAuthStatus } from '../services/iValtService';
import XMarkIcon from './icons/XMarkIcon';
import BoltIcon from './icons/BoltIcon';

interface Props {
  phoneNumber: string;
  onSuccess: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function IValtModal({ phoneNumber, onSuccess, onCancel, isOpen }: Props) {
  const [status, setStatus] = useState<IValtAuthStatus>({
    status: 'pending',
    message: 'Initializing Secure Link...',
  });
  
  const locked = useRef(false);
  const initialized = useRef(false);
  const service = useRef(new IValtService());

  // Enforce +1 formatting for display
  const cleanDigits = phoneNumber.replace(/\D/g, '');
  const displayPhone = cleanDigits.length === 10 ? `+1 ${cleanDigits.slice(0,3)}-${cleanDigits.slice(3,6)}-${cleanDigits.slice(6)}` : `+${cleanDigits}`;

  useEffect(() => {
    // Auto-start on mount if open
    if (isOpen && !initialized.current) {
        initialized.current = true;
        startHandshake();
    }

    if (!isOpen) {
        initialized.current = false;
        service.current.cancel();
    }

    return () => {
      service.current.cancel();
      locked.current = true;
    };
  }, [isOpen]);

  const startHandshake = async () => {
    try {
      await service.current.initiateHandshake(phoneNumber);
      setStatus({ status: 'pending', message: 'Uplink Established. Check your phone...' });

      service.current.startPolling(
        (s) => {
          if (locked.current) return;
          if (s.status === 'success') {
            locked.current = true;
          }
          setStatus(s);
        },
        onSuccess,
        (err) => {
          if (!locked.current) {
            setStatus({ status: 'failed', message: err });
          }
        }
      );
      
    } catch (err) {
      if (!locked.current) {
        setStatus({
          status: 'failed',
          message: err instanceof Error ? err.message : 'Uplink failed. Please retry.',
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gemynd-deep-brown/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full mx-4 border border-gemynd-soft-peach shadow-2xl relative overflow-hidden">
        {/* Hardware Handshake Scan Beam */}
        {status.status === 'pending' && (
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,1)] animate-scan-beam z-10"></div>
        )}

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gemynd-terracotta/10 rounded-full flex items-center justify-center">
            <BoltIcon className="text-gemynd-terracotta w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-gemynd-deep-brown">Biometric Link</h2>
            <p className="text-[10px] font-bold text-gemynd-terracotta uppercase tracking-widest">WestFlow Protocol v7.6</p>
          </div>
        </div>

        <div className="bg-gemynd-cream rounded-2xl p-8 mb-6 text-center border border-gemynd-soft-peach">
          {status.status === 'pending' && (
            <div className="text-4xl mb-4 animate-pulse">🧤</div>
          )}
          {status.status === 'success' && (
            <div className="text-green-500 text-4xl mb-4">✓</div>
          )}
          {status.status === 'failed' && (
            <div className="text-red-500 text-4xl mb-4">✗</div>
          )}
          
          <p className="text-gemynd-deep-brown font-bold text-lg mb-2">{status.message}</p>
          {status.step && (
            <p className="text-gemynd-terracotta text-xs font-mono">STEP_PROG: {status.step}</p>
          )}
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-8 border border-slate-100">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Target Endpoint ID</p>
          <p className="text-gemynd-deep-brown font-mono text-sm">{displayPhone}</p>
        </div>

        <div className="flex flex-col gap-3">
          {status.status === 'failed' && (
             <button
              onClick={() => {
                setStatus({ status: 'pending', message: 'Retrying Secure Link...' });
                startHandshake();
              }}
              className="w-full bg-gemynd-terracotta hover:bg-gemynd-sienna text-white font-bold py-4 rounded-xl transition-all shadow-warm transform active:scale-95"
            >
              Retry Uplink
            </button>
          )}

          <button
            onClick={onCancel}
            className="w-full py-3 text-gemynd-terracotta font-bold text-sm hover:underline"
          >
            {status.status === 'success' ? 'Redirecting...' : 'Cancel Protocol'}
          </button>
        </div>

        <p className="text-slate-400 text-[9px] text-center mt-8 uppercase tracking-[0.2em]">
          Zero Trust Identity Infrastructure
        </p>
      </div>
      <style>{`
        @keyframes scan-beam {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-beam {
          animation: scan-beam 2s linear infinite;
        }
      `}</style>
    </div>
  );
}