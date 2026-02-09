import React from 'react';
import PlusIcon from './icons/PlusIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import ConnectivityIndicator from './ConnectivityIndicator';
import SparklesIcon from './icons/SparklesIcon';
import HomeIcon from './icons/HomeIcon';
import BoltIcon from './icons/BoltIcon';
import { Customer } from '../types';

const NavButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center p-4 rounded-2xl transition-all duration-300 text-left gap-4 group haptic-tap ${
      isActive
        ? 'bg-gemynd-oxblood text-white shadow-lg'
        : 'text-white/40 hover:bg-white/5 hover:text-gemynd-agedGold'
    }`}
  >
    <span className={`${isActive ? 'text-white' : 'text-gemynd-agedGold'} group-hover:scale-110 transition-transform`}>
        {children}
    </span>
    <span className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">{label}</span>
  </button>
);

const LeftSidebar: React.FC<{
  currentView: string;
  setView: (view: string) => void;
  customer: Customer;
  onLogout?: () => void;
}> = ({ currentView, setView, onLogout, customer }) => {
  return (
    <aside className="w-full h-full bg-gemynd-mahogany flex flex-col justify-between p-8 border-r border-white/5">
      <div className="space-y-12">
        <header className="px-2 flex items-center gap-4">
            <div className="p-3 bg-gemynd-oxblood rounded-xl shadow-xl">
                <BoltIcon className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="text-2xl font-display font-black text-white tracking-tight">Gemynd.</h1>
                <p className="text-[9px] font-black text-gemynd-agedGold/40 uppercase tracking-[0.4em] mt-0.5">Scribe Node</p>
            </div>
        </header>

        <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 shadow-inner">
            <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Archive Core</span>
                <span className="text-[9px] font-black text-gemynd-agedGold uppercase tracking-widest">Uplink Stable</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gemynd-agedGold shadow-[0_0_10px_#D4AF37]" style={{width: '100%'}}></div>
            </div>
            <p className="text-[10px] font-black text-white/20 uppercase truncate">Archivist: {customer.name}</p>
        </div>
        
        <nav className="space-y-2">
            <NavButton label="Home Base" isActive={currentView === 'welcome'} onClick={() => setView('welcome')}>
              <HomeIcon className="w-5 h-5" />
            </NavButton>
            <NavButton label="Restore Studio" isActive={currentView === 'restore-studio'} onClick={() => setView('restore-studio')}>
              <SparklesIcon className="w-5 h-5" />
            </NavButton>
            <NavButton label="New Legacy" isActive={currentView === 'new-story'} onClick={() => setView('new-story')}>
              <PlusIcon className="w-5 h-5" />
            </NavButton>
            <NavButton label="Legacy Vault" isActive={currentView === 'archive'} onClick={() => setView('archive')}>
              <ArchiveBoxIcon className="w-5 h-5" />
            </NavButton>
        </nav>
      </div>
      
      <div className="space-y-6 pt-10 border-t border-white/5">
        <ConnectivityIndicator />
        
        {onLogout && (
          <button 
            onClick={onLogout}
            className="w-full flex items-center p-4 rounded-2xl text-white/20 hover:text-red-400 hover:bg-gemynd-oxblood/5 transition-all group haptic-tap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:rotate-12 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] ml-4">Terminate Link</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar;