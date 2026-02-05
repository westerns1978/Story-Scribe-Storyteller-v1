
import React from 'react';
import { useTheme } from '../hooks/useTheme';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';
import PlusIcon from './icons/PlusIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import CodeBracketIcon from './icons/CodeBracketIcon';
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
        : 'text-gemynd-ink/60 dark:text-white/40 hover:bg-gemynd-ink/5 dark:hover:bg-white/5 hover:text-gemynd-oxblood dark:hover:text-gemynd-agedGold'
    }`}
  >
    <span className={`${isActive ? 'text-white' : 'text-gemynd-oxblood dark:text-gemynd-agedGold'} group-hover:scale-110 transition-transform`}>
        {children}
    </span>
    <span className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">{label}</span>
  </button>
);

const LeftSidebar: React.FC<{
  currentView: string;
  setView: (view: string) => void;
  onSettings: () => void;
  onDebug: () => void;
  onHelp: () => void;
  onOpenConnie: () => void;
  customer: Customer;
  onLogout?: () => void;
}> = ({ currentView, setView, onDebug, onLogout, customer }) => {
  const { theme, toggleTheme } = useTheme();

  const handlePreviewStoryteller = () => {
    localStorage.setItem('storyscribe_user', JSON.stringify({ role: 'storyteller' }));
    window.location.search = '?mode=storyteller';
  };

  return (
    <aside className="w-full h-full bg-gemynd-linen dark:bg-gemynd-mahogany flex flex-col justify-between p-8">
      <div className="space-y-12">
        <header className="px-2 flex items-center gap-4">
            <div className="p-3 bg-gemynd-oxblood rounded-xl shadow-xl">
                <BoltIcon className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="text-2xl font-display font-black text-gemynd-ink dark:text-white tracking-tight">Gemynd.</h1>
                <p className="text-[9px] font-black text-gemynd-oxblood/40 dark:text-gemynd-agedGold/40 uppercase tracking-[0.4em] mt-0.5">Scribe Node</p>
            </div>
        </header>

        <div className="p-6 bg-white dark:bg-white/5 rounded-[2rem] border border-gemynd-ink/5 dark:border-white/5 shadow-inner">
            <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-black text-gemynd-ink/30 dark:text-white/20 uppercase tracking-widest">Active Core</span>
                <span className="text-[9px] font-black text-gemynd-oxblood dark:text-gemynd-agedGold uppercase tracking-widest">Level 10</span>
            </div>
            <div className="h-1.5 w-full bg-gemynd-ink/5 dark:bg-white/5 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gemynd-oxblood dark:bg-gemynd-agedGold" style={{width: '100%'}}></div>
            </div>
            <p className="text-[10px] font-black text-gemynd-ink/40 dark:text-white/20 uppercase truncate">Archivist: {customer.name}</p>
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

        {/* Temporary Test Button */}
        <button 
            onClick={handlePreviewStoryteller}
            className="w-full mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[9px] font-black uppercase text-amber-600 tracking-[0.2em] hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2 group shadow-sm"
        >
            <SparklesIcon className="w-4 h-4 transition-transform group-hover:rotate-12" />
            Preview Storyteller Mode
        </button>
      </div>
      
      <div className="space-y-6 pt-10 border-t border-gemynd-ink/5 dark:border-white/5">
        <ConnectivityIndicator />
        
        <div className="grid grid-cols-2 gap-3">
            <button onClick={toggleTheme} className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white dark:bg-white/5 hover:bg-gemynd-ink/5 dark:hover:bg-white/10 transition-all text-gemynd-ink/60 dark:text-white/40 haptic-tap border border-transparent hover:border-gemynd-ink/10">
                {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                <span className="text-[8px] font-black uppercase mt-3 tracking-widest">Lights</span>
            </button>
            <button onClick={onDebug} className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white dark:bg-white/5 hover:bg-gemynd-ink/5 dark:hover:bg-white/10 transition-all text-gemynd-ink/60 dark:text-white/40 haptic-tap border border-transparent hover:border-gemynd-ink/10">
                <CodeBracketIcon className="w-5 h-5"/>
                <span className="text-[8px] font-black uppercase mt-3 tracking-widest">Debug</span>
            </button>
        </div>

        {onLogout && (
          <button 
            onClick={onLogout}
            className="w-full flex items-center p-4 rounded-2xl text-gemynd-ink/30 dark:text-white/20 hover:text-gemynd-oxblood dark:hover:text-red-400 hover:bg-gemynd-oxblood/5 transition-all group"
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
