import React, { useState } from 'react';
import { IValtModal } from './IValtModal';
import EyeIcon from './icons/EyeIcon';
import EyeSlashIcon from './icons/EyeSlashIcon';

interface LoginViewProps {
    onLogin: (customer: any) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
    const [phone, setPhone] = useState('');
    const [showPhone, setShowPhone] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [authStatus, setAuthStatus] = useState<string>('');
    const [showIValt, setShowIValt] = useState(false);

    const handleApiKeyHandshake = async () => {
        const aiStudio = (window as any).aistudio;
        if (aiStudio && typeof aiStudio.hasSelectedApiKey === 'function') {
            try {
                const hasKey = await aiStudio.hasSelectedApiKey();
                if (!hasKey) {
                    setAuthStatus('Uplinking Node...');
                    await aiStudio.openSelectKey();
                }
            } catch (err) {
                console.warn("[Auth] Handshake skipped", err);
            }
        }
    };

    const handleBiometricTrigger = (e: React.FormEvent) => {
        e.preventDefault();
        const digits = phone.replace(/\D/g, '');
        if (digits.length >= 10) {
            setShowIValt(true);
        } else {
            alert("Terminal Error: Please enter a valid 10-digit identification number.");
        }
    };

    const handleAdminBypass = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setAuthStatus('Opening Vault...');
        try {
            await handleApiKeyHandshake();
            sessionStorage.setItem('flowview_auth', 'bypass');
            const adminUser = {
                id: 'admin-001',
                email: 'admin@gemynd.com',
                name: 'Archive Curator',
                tier: 'full_story_scribe',
                credits: { photos: 999, stories: 999 },
                joinedAt: new Date().toISOString(),
                is_admin: true
            };
            localStorage.setItem('storyscribe_customer', JSON.stringify(adminUser));
            onLogin(adminUser);
        } catch (err) {
            alert("Uplink failed. Please select a valid key.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#0D0B0A] font-sans selection:bg-gemynd-oxblood selection:text-white">
            {/* Ambient Lexington Environment */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Top Right Amber Glow */}
                <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] bg-amber-500/10 blur-[140px] rounded-full animate-pulse"></div>
                {/* Center Depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#1A1412]/50 via-[#0D0B0A] to-[#050404]"></div>
                {/* Subtle Grain */}
                <div className="absolute inset-0 opacity-[0.03] paper-grain pointer-events-none"></div>
            </div>

            <div className="relative z-10 w-full max-w-lg animate-fade-in">
                {/* Logo Section */}
                <div className="text-center mb-12">
                    <div className="w-24 h-24 mx-auto mb-10 relative group">
                        <div className="absolute inset-0 bg-gemynd-oxblood/30 blur-3xl rounded-full animate-pulse group-hover:scale-125 transition-transform duration-[3000ms]"></div>
                        <img 
                            src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" 
                            className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(168,45,45,0.6)] relative z-10 transform group-hover:scale-105 transition-transform duration-700"
                            alt="Gemynd Logo"
                        />
                    </div>
                    <span className="text-gemynd-agedGold font-black tracking-[0.6em] uppercase text-[10px] mb-3 block opacity-90">Secure Heritage Archive</span>
                    <h1 className="text-5xl lg:text-7xl font-display font-black text-white tracking-tighter leading-none mb-3">
                        Legacy Access
                    </h1>
                    <p className="text-white/20 font-serif italic text-base lg:text-lg">Distributed Memory Protocol v4.2</p>
                </div>

                {/* Dark-Glass Modal */}
                <div className="bg-white/[0.03] backdrop-blur-3xl p-10 lg:p-14 rounded-[3.5rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] relative overflow-hidden group">
                    {/* Interior Rim Lighting */}
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    
                    <form onSubmit={handleBiometricTrigger} className="space-y-10 relative z-10">
                        <div className="space-y-8">
                            <div className="relative">
                                <label className="text-[10px] font-black text-gemynd-agedGold/50 uppercase tracking-[0.4em] ml-6 mb-3 block">Terminal Identifier</label>
                                <div className="relative">
                                    <input 
                                        type={showPhone ? "tel" : "password"} 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))}
                                        className="w-full bg-black/60 border border-white/10 rounded-full py-6 px-10 text-white font-mono text-2xl focus:border-gemynd-agedGold/40 focus:ring-4 focus:ring-gemynd-agedGold/5 outline-none transition-all tracking-[0.3em] placeholder:text-white/5 shadow-inner group-hover:border-white/20"
                                        placeholder="0000000000"
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPhone(!showPhone)}
                                        className="absolute right-8 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors p-2"
                                    >
                                        {showPhone ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={phone.length < 10 || isLoading}
                                className="w-full py-6 bg-gemynd-oxblood hover:bg-[#B33535] text-white font-black rounded-full shadow-[0_15px_40px_rgba(168,45,45,0.4)] active:scale-95 disabled:opacity-20 disabled:grayscale transition-all uppercase tracking-[0.5em] text-[11px] border border-white/5"
                            >
                                Verify Identity
                            </button>
                        </div>

                        <div className="relative flex items-center justify-center">
                            <div className="w-full h-px bg-white/5"></div>
                            <span className="absolute bg-[#1A1412] px-6 text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">WestFlow Protocol 7.6</span>
                        </div>

                        <button 
                            onClick={handleAdminBypass}
                            disabled={isLoading}
                            className="w-full text-center text-white/30 hover:text-gemynd-agedGold transition-all text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-gemynd-agedGold border-t-transparent rounded-full animate-spin"></div>
                                    <span className="animate-pulse">{authStatus}</span>
                                </>
                            ) : (
                                'Initiate Administrative Override'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Monospace */}
                <div className="mt-12 text-center">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.4em] mb-6">
                        LEXINGTON CENTRAL NODE • PRODUCTION UPLINK V4.2
                    </p>
                    <div className="flex justify-center gap-4 opacity-10">
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginView;