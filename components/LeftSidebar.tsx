import React from 'react';
import HomeIcon from './icons/HomeIcon';
import PlusIcon from './icons/PlusIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import { Customer } from '../types';

const NavButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-5 py-3.5 min-h-[52px] rounded-xl transition-all duration-200 text-left gap-4 haptic-tap nav-item ${
      isActive
        ? 'bg-heritage-warmGold/10 text-heritage-warmGold'
        : 'text-heritage-inkSoft hover:bg-heritage-linen hover:text-heritage-ink'
    }`}
  >
    <span className={`${isActive ? 'text-heritage-warmGold' : 'text-heritage-inkMuted'}`}>
        {children}
    </span>
    <span className="text-base font-semibold leading-none">{label}</span>
  </button>
);

const LeftSidebar: React.FC<{
  currentView: string;
  setView: (view: string) => void;
  customer: Customer;
  onLogout?: () => void;
}> = ({ currentView, setView, onLogout, customer }) => {
  return (
    <aside className="w-full h-full bg-white flex flex-col justify-between p-8 border-r border-heritage-parchment transition-colors duration-300">
      <div className="space-y-12">
        <header className="px-2">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label="Book">📖</span>
                    <h1 className="text-2xl font-serif font-bold text-heritage-ink tracking-tight">Wissums</h1>
                </div>
                <p className="text-[11px] font-bold text-heritage-warmGold uppercase tracking-[0.2em] ml-8">by Wissums</p>
            </div>
        </header>

        <nav className="space-y-2">
            <NavButton label="Home" isActive={currentView === 'welcome'} onClick={() => setView('welcome')}>
              <HomeIcon className="w-6 h-6" />
            </NavButton>
            <NavButton label="New Story" isActive={currentView === 'new-story'} onClick={() => setView('new-story')}>
              <PlusIcon className="w-6 h-6" />
            </NavButton>
            <NavButton label="My Stories" isActive={currentView === 'archive'} onClick={() => setView('archive')}>
              <ArchiveBoxIcon className="w-6 h-6" />
            </NavButton>
        </nav>
      </div>
      
      <div className="pt-8 border-t border-heritage-parchment">
        <div className="px-2 mb-6">
            <p className="text-sm font-bold text-heritage-ink">Navarre Gardens</p>
            <p className="text-[11px] text-heritage-inkMuted uppercase tracking-widest mt-1">Storyteller Session</p>
        </div>
        
        {onLogout && (
          <button 
            onClick={onLogout}
            className="w-full flex items-center px-5 py-3 rounded-xl text-heritage-inkMuted hover:text-heritage-burgundy hover:bg-heritage-burgundy/5 transition-all group haptic-tap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:rotate-12 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            <span className="text-sm font-bold ml-4">Logout</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar;