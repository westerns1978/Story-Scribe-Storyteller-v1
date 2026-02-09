import React, { useState } from 'react';
import { IValtModal } from './IValtModal';
import EyeIcon from './icons/EyeIcon';
import EyeSlashIcon from './icons/EyeSlashIcon';
import { Customer } from '../types';
import Loader2Icon from './icons/Loader2Icon';

interface LandingGateProps {
    onLogin: (customer: Customer) => void;
}

export const LandingGate: React.FC<LandingGateProps> = ({ onLogin }) => {
    const [phone, setPhone] = useState('');
    const [showPhone, setShowPhone] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showIValt, setShowIValt] = useState(false);

    const handleAdminBypass = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Check for Gemini API Key availability (standard procedure)
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
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#0D0B0A] font-sans">
            {/* Environment Layers */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] bg-gemynd-oxblood/10 blur-[140px] rounded-full" />
                <div className="absolute -bottom-[10%] -left-[10%] w-[60%] h-[60%] bg-amber-500/5 blur-[140px] rounded-full" />
                <div className="absolute inset-0 opacity-[0.03] paper-grain" />
            </div>

            <div className="relative z-10 w-full max-w-lg animate-fade-in text-center">
                <div className="mb-16">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl border border-white/5 relative group">
                        <div className="absolute inset-0 bg-gemynd-oxblood/20 blur-2xl rounded-full group-hover:scale-150 transition-all duration-[3s]" />
                        <img 
                            src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" 
                            className="w-12 relative z-10" 
                            alt="Logo"
                        />
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-display font-black text-white tracking-tighter leading-none mb-4">Gemynd.</h1>
                    <p className="text-white/20 font-serif italic text-lg lg:text-xl">Legacy Preservation Infrastructure</p>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-3xl p-10 lg:p-14 rounded-[3.5rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] animate-slide-up">
                    <form onSubmit={(e) => { e.preventDefault(); setShowIValt(true); }} className="space-y-10">
                        <div className="space-y-3 text-left">
                            <label className="text-[10px] font-black text-amber-500/50 uppercase tracking-[0.4em] ml-6 block">Security Identifier</label>
                            <div className="relative">
                                <input 
                                    type={showPhone ? "tel" : "password"} 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))}
                                    className="w-full bg-black/60 border border-white/10 rounded-full py-6 px-10 text-white font-mono text-2xl focus:border-amber-500/40 outline-none transition-all tracking-[0.3em] placeholder:text-white/5"
                                    placeholder="0000000000"
                                    required
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPhone(!showPhone)}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 text-white/20 hover:text-white p-2"
                                >
                                    {showPhone ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={phone.length < 10}
                            className="w-full py-6 bg-gemynd-oxblood text-white font-black rounded-full shadow-2xl transition-all active:scale-95 disabled:opacity-20 uppercase tracking-[0.4em] text-[11px] border border-white/5"
                        >
                            Request Biometric Handshake
                        </button>

                        <div className="relative flex items-center justify-center">
                            <div className="w-full h-px bg-white/5"></div>
                            <span className="absolute bg-[#0D0B0A] px-6 text-[8px] font-black text-white/10 uppercase tracking-[0.4em]">Lexington Protocol</span>
                        </div>

                        <button 
                            onClick={handleAdminBypass}
                            disabled={isLoading}
                            className="w-full text-center text-white/30 hover:text-amber-500 transition-all text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3"
                        >
                            {isLoading ? <><Loader2Icon className="w-4 h-4 animate-spin" /> Uplinking...</> : 'Bypass Biometrics'}
                        </button>
                    </form>
                </div>

                <div className="mt-16 opacity-10">
                    <p className="text-[9px] font-mono text-white tracking-[0.4em] uppercase">Authorized Curators Only • v4.2.1</p>
                </div>
            </div>

            {showIValt && (
                <IValtModal 
                    phoneNumber={phone} 
                    onSuccess={() => handleAdminBypass(new Event('submit') as any)} 
                    onCancel={() => setShowIValt(false)} 
                    isOpen={true} 
                />
            )}
        </div>
    );
};