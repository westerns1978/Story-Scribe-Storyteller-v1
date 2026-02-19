import React, { useState } from 'react';
import BookOpenIcon from '../../components/icons/BookOpenIcon';

interface WelcomeScreenProps {
  onBegin: (name: string, language: string) => void;
  onLogout: () => void;
}

const SUPPORTED_LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇲🇽' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'tl', label: 'Tagalog', flag: '🇵🇭' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'af', label: 'Afrikaans', flag: '🇿🇦' },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onBegin, onLogout }) => {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onBegin(name.trim(), language);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-gemynd-linen relative animate-fade-in">
      <div className="absolute inset-0 paper-grain pointer-events-none opacity-20" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gemynd-oxblood/5 blur-[120px] rounded-full" />
      
      <div className="relative z-10 max-w-lg w-full text-center space-y-8">
        <div className="space-y-6">
          <img 
            src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" 
            className="w-14 mx-auto drop-shadow-xl" 
            alt="Gemynd" 
          />
          <h1 className="text-3xl lg:text-5xl font-display font-black text-gemynd-ink tracking-tight">
            Let's remember <br/><span className="text-gemynd-oxblood">them together.</span>
          </h1>
          <p className="text-base lg:text-lg font-serif italic text-gemynd-ink/60">Every legacy begins with a single memory.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-white/40 p-8 rounded-[2.5rem] border border-gemynd-oxblood/5 shadow-inner">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gemynd-ink/30 block">Preferred Language</label>
            <div className="grid grid-cols-3 gap-3">
                {SUPPORTED_LANGUAGES.map(lang => (
                    <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${language === lang.code ? 'bg-gemynd-oxblood text-white shadow-lg' : 'bg-white border border-gemynd-ink/5 text-gemynd-ink/40 hover:bg-gemynd-linen'}`}
                    >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                    </button>
                ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gemynd-ink/30 block">Who are we remembering today?</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter their name"
              className="w-full bg-white border border-gemynd-ink/10 rounded-[2rem] px-8 py-4 text-xl text-gemynd-ink text-center focus:ring-4 focus:ring-gemynd-oxblood/5 outline-none transition-all shadow-sm font-serif italic placeholder:text-gemynd-ink/10"
              autoFocus
            />
          </div>
          
          <button 
            type="submit"
            disabled={!name.trim()}
            className="w-full py-5 bg-gemynd-oxblood text-white font-black rounded-[2rem] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.3em] disabled:opacity-20 flex items-center justify-center gap-4"
          >
            <BookOpenIcon className="w-5 h-5" />
            Begin the session
          </button>
        </form>

        <button 
          onClick={onLogout}
          className="text-[10px] font-black uppercase tracking-widest text-gemynd-ink/20 hover:text-gemynd-oxblood transition-colors"
        >
          Close Archive Link
        </button>
      </div>
    </div>
  );
};