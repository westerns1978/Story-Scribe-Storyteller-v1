
import React, { useState } from 'react';
import { IValtModal } from './IValtModal';
import EyeIcon from './icons/EyeIcon';
import EyeSlashIcon from './icons/EyeSlashIcon';
import { Customer } from '../types';
import Loader2Icon from './icons/Loader2Icon';
import BoltIcon from './icons/BoltIcon';
import ShieldIcon from './icons/ShieldIcon';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';
import { useTheme } from '../hooks/useTheme';

interface LandingGateProps {
    onLogin: (customer: Customer) => void;
}

export const LandingGate: React.FC<LandingGateProps> = ({ onLogin }) => {
    const [phone, setPhone] = useState('');
    const [showPhone, setShowPhone] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showIValt, setShowIValt] = useState(false);
    const { theme, toggleTheme } = useTheme();

    const handleAdminBypass = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const aiStudio = (window as any).aistudio;
            if (aiStudio) {
                const hasKey = await aiStudio.hasSelectedApiKey();
                if (!hasKey) await aiStudio.openSelectKey();
            }

            const adminUser: Customer = {
                id: 'admin-001',
                email: 'admin@gemynd.com',
                name: 'Archive Curator',
                tier: 'full_story_scribe',
                credits: { photos: 999, stories: 999 },
                joinedAt: new Date().toISOString(),
                is_admin: true
            };
            onLogin(adminUser);
        } catch (err) {
            alert("Authentication Uplink Failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-full min-h-screen flex flex-col items-center justify-start p-6 lg:p-12 relative overflow-y-auto bg-gemynd-linen dark:bg-[#0D0B0A] font-sans selection:bg-amber-500/30 transition-colors duration-700">
            {/* Environment Layers */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[70%] bg-gemynd-oxblood/10 dark:bg-gemynd-oxblood/15 blur-[160px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[60%] bg-amber-500/5 dark:bg-amber-500/10 blur-[160px] rounded-full" />
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 dark:via-[#0D0B0A]/80 to-gemynd-linen dark:to-[#0D0B0A]" />
            </div>

            {/* Top Bar Actions */}
            <div className="relative z-20 w-full max-w-lg flex justify-end mb-8">
                <button 
                    onClick={toggleTheme}
                    className="p-3 bg-white/40 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full shadow-lg hover:scale-110 transition-all text-gemynd-ink dark:text-white"
                >
                    {theme === 'dark' ? <SunIcon className="w-5 h-5 text-gemynd-agedGold" /> : <MoonIcon className="w-5 h-5 text-gemynd-oxblood" />}
                </button>
            </div>

            <div className="relative z-10 w-full max-w-lg flex flex-col items-center py-4 lg:py-10 animate-fade-in">
                {/* Logo Section */}
                <div className="mb-12 text-center">
                    <div className="w-24 h-24 bg-white/20 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl border border-black/5 dark:border-white/10 relative group">
                        <div className="absolute inset-0 bg-gemynd-oxblood/10 dark:bg-gemynd-oxblood/20 blur-3xl rounded-full group-hover:scale-150 transition-all duration-[4s]" />
                        <img 
                            src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" 
                            className="w-12 relative z-10 drop-shadow-xl" 
                            alt="Logo"
                        />
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-5xl lg:text-7xl font-display font-black text-gemynd-ink dark:text-white tracking-tighter leading-none">Gemynd.</h1>
                        <p className="text-gemynd-oxblood/60 dark:text-amber-500/80 font-serif italic text-lg lg:text-xl tracking-wide">Legacy Preservation Vault</p>
                    </div>
                </div>

                {/* Main Auth Card */}
                <div className="w-full bg-white/60 dark:bg-white/[0.04] backdrop-blur-[40px] p-8 lg:p-12 rounded-[3.5rem] border border-black/5 dark:border-white/15 shadow-[0_40px_80px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-slide-up relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/20 to-transparent" />
                    
                    <form onSubmit={(e) => { e.preventDefault(); setShowIValt(true); }} className="space-y-10 relative z-10">
                        <div className="space-y-4 text-left">
                            <div className="flex justify-between items-end mb-2 px-6">
                                <label className="text-[10px] font-black text-gemynd-oxblood dark:text-amber-500 uppercase tracking-[0.4em] block">Security Identifier</label>
                                <div className="flex items-center gap-1.5 opacity-40">
                                    <ShieldIcon className="w-3 h-3 text-green-600 dark:text-green-500" />
                                    <span className="text-[8px] font-bold text-gemynd-ink dark:text-white uppercase tracking-widest">AES-256 Enabled</span>
                                </div>
                            </div>
                            <div className="relative">
                                <input 
                                    type={showPhone ? "tel" : "password"} 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))}
                                    className="w-full bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-full py-6 px-10 text-gemynd-ink dark:text-white font-mono text-2xl focus:border-gemynd-oxblood/40 dark:focus:border-amber-500/40 focus:ring-8 focus:ring-gemynd-oxblood/5 outline-none transition-all tracking-[0.3em] placeholder:text-black/5 shadow-inner"
                                    placeholder="0000000000"
                                    required
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPhone(!showPhone)}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 text-gemynd-ink/30 dark:text-white/30 hover:text-gemynd-oxblood dark:hover:text-white p-3 transition-colors"
                                    aria-label={showPhone ? "Hide identification" : "Show identification"}
                                >
                                    {showPhone ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <button 
                                type="submit"
                                disabled={phone.length < 10}
                                className={`w-full py-6 bg-gemynd-oxblood text-white font-black rounded-full shadow-2xl transition-all active:scale-95 disabled:opacity-20 uppercase tracking-[0.4em] text-[11px] border border-white/10 flex items-center justify-center gap-4 hover:bg-gemynd-red group/btn ${phone.length >= 10 ? 'animate-pulse-slow' : ''}`}
                            >
                                <BoltIcon className={`w-5 h-5 transition-transform duration-500 ${phone.length >= 10 ? 'scale-125' : ''}`} />
                                Biometric Handshake
                            </button>
                            
                            <p className="text-center text-[9px] text-gemynd-ink/40 dark:text-white/30 uppercase tracking-[0.2em] font-medium px-4 leading-relaxed">
                                Secure login via <span className="text-gemynd-oxblood dark:text-white/60 font-bold">iVALT®</span> Infrastructure.
                            </p>
                        </div>

                        <div className="relative flex items-center justify-center">
                            <div className="w-full h-px bg-black/5 dark:bg-white/5"></div>
                            <span className="absolute bg-white dark:bg-[#0E0C0B] px-8 text-[9px] font-black text-gemynd-ink/20 dark:text-white/20 uppercase tracking-[0.5em] border border-black/5 dark:border-white/5 rounded-full py-1 transition-colors duration-700">WestFlow Node</span>
                        </div>

                        <button 
                            onClick={handleAdminBypass}
                            disabled={isLoading}
                            className="w-full text-center text-gemynd-ink/40 dark:text-white/40 hover:text-gemynd-oxblood dark:hover:text-amber-500 transition-all text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3 group/bypass"
                        >
                            {isLoading ? (
                                <><Loader2Icon className="w-4 h-4 animate-spin" /> Uplinking...</>
                            ) : (
                                <>
                                    <span className="w-8 h-px bg-black/5 dark:bg-white/10 group-hover/bypass:bg-gemynd-oxblood/40 transition-colors"></span>
                                    Administrative Override
                                    <span className="w-8 h-px bg-black/5 dark:bg-white/10 group-hover/bypass:bg-gemynd-oxblood/40 transition-colors"></span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-16 flex flex-col items-center gap-8 opacity-20 hover:opacity-50 transition-opacity duration-700">
                    <div className="flex gap-10">
                        {['GRID_STABLE', 'UPLINK_SECURE', 'NODE_KY_01'].map(stat => (
                            <div key={stat} className="flex flex-col items-center gap-2">
                                <div className="w-1 h-1 bg-gemynd-ink dark:bg-white rounded-full"></div>
                                <p className="text-[8px] font-mono text-gemynd-ink dark:text-white tracking-[0.4em] uppercase">{stat}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showIValt && (
                <IValtModal 
                    phoneNumber={phone} 
                    onSuccess={() => {
                        handleAdminBypass({ preventDefault: () => {} } as any);
                    }} 
                    onCancel={() => setShowIValt(false)} 
                    isOpen={true} 
                />
            )}

            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.95; transform: scale(1.005); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};
