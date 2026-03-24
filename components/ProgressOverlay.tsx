import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressOverlayProps {
  stage: number; // 0=scribe 1=cartographer 2=illustrator 3=archivist
}

const STAGE_CONFIG = [
  {
    name: 'Listening',
    role: 'Reading between the lines',
    icon: '✦',
    color: '#C4973B',
    discoveries: [
      'Finding the moments that shaped a life…',
      'Hearing the voices behind the words…',
      'Tracing the love woven through these memories…',
      'Following the thread from childhood forward…',
      'Feeling the weight of what was left unsaid…',
      'Gathering the pieces into something whole…',
    ],
  },
  {
    name: 'Remembering',
    role: 'Placing you in time',
    icon: '◎',
    color: '#7A8B6F',
    discoveries: [
      'Anchoring moments to the world they lived in…',
      'Feeling the texture of those particular years…',
      'Remembering what the world looked like then…',
      'Finding the larger story inside the smaller one…',
    ],
  },
  {
    name: 'Painting',
    role: 'Bringing it to life',
    icon: '❋',
    color: '#8B2E3B',
    discoveries: [
      'Imagining what the light looked like that day…',
      'Painting the faces and the places…',
      'Rendering the world as they knew it…',
      'Giving form to what memory holds…',
      'Composing each scene with care…',
    ],
  },
  {
    name: 'Preserving',
    role: 'Sealing it for always',
    icon: '◈',
    color: '#C4973B',
    discoveries: [
      'Binding the story into its final form…',
      'Saving this legacy to the vault…',
      'Preparing it to be shared with those who love them…',
      'Almost ready…',
    ],
  },
];

const AMBIENT_LINES = [
  '"A life fully lived leaves infinite stories."',
  '"What we remember, we keep alive."',
  '"Every ordinary moment is extraordinary in memory."',
  '"The stories we tell become the lives we live."',
  '"Love is the thread that holds every story together."',
];

// Subtle animated dots — "thinking" indicator
const ThinkingDots: React.FC<{ color: string }> = ({ color }) => {
  return (
    <span className="inline-flex gap-1 ml-1">
      {[0,1,2].map(i => (
        <span key={i}
          className="inline-block w-1 h-1 rounded-full animate-pulse"
          style={{
            background: color,
            animation: `breathe 1.5s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`
          }}
        />
      ))}
    </span>
  );
};

const ProgressOverlay: React.FC<ProgressOverlayProps> = ({ stage }) => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const [ambientIdx, setAmbientIdx] = useState(0);
  const [showAmbient, setShowAmbient] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  
  const currentStage = STAGE_CONFIG[Math.min(stage, STAGE_CONFIG.length - 1)];
  const discoveries = currentStage.discoveries;

  // Tick every 50ms — slower typewriter
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  // Typewriter
  useEffect(() => {
    if (lineIndex >= discoveries.length) return;
    const target = discoveries[lineIndex];
    if (charIndex < target.length) {
      setCurrentText(target.slice(0, charIndex + 1));
      setCharIndex(c => c + 1);
    } else {
      const pause = setTimeout(() => {
        setDisplayedLines(prev => [...prev.slice(-4), target]);
        setCurrentText('');
        setCharIndex(0);
        setLineIndex(l => l + 1);
      }, 1000); // longer pause between lines
      return () => clearTimeout(pause);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // Reset on stage change
  useEffect(() => {
    setDisplayedLines([]);
    setCurrentText('');
    setCharIndex(0);
    setLineIndex(0);
  }, [stage]);

  // Ambient quote
  useEffect(() => {
    const id = setInterval(() => {
      setShowAmbient(false);
      setTimeout(() => {
        setAmbientIdx(i => (i + 1) % AMBIENT_LINES.length);
        setShowAmbient(true);
      }, 600);
    }, 7000);
    setShowAmbient(true);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [displayedLines, currentText]);

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#080604' }}
    >
      {/* Film grain */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px',
        }}
      />

      {/* Warm hearth glow — shifts with stage */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-2000"
        style={{
          background: `radial-gradient(ellipse 55% 45% at 50% 55%, ${currentStage.color}16 0%, transparent 70%)`,
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="relative z-10 w-full max-w-md px-10 flex flex-col items-center gap-7"
        >
          {/* Icon — large, glowing, not a logo */}
          <div className="relative flex items-center justify-center">
            <div
              className="absolute blur-2xl rounded-full animate-pulse"
              style={{
                width: 80, height: 80,
                background: `${currentStage.color}30`,
              }}
            />
            <span
              className="relative z-10 text-4xl leading-none select-none"
              style={{ color: currentStage.color, textShadow: `0 0 24px ${currentStage.color}60` }}
            >
              {currentStage.icon}
            </span>
          </div>

          {/* Stage name + role */}
          <div className="text-center space-y-1.5">
            <p className="text-[8px] font-black uppercase tracking-[0.6em]"
              style={{ color: `${currentStage.color}70` }}>
              {currentStage.name}
            </p>
            <h2 className="text-[22px] font-serif italic leading-snug"
              style={{ color: '#F5ECD7' }}>
              {currentStage.role}
              <ThinkingDots color={currentStage.color} />
            </h2>
          </div>

          {/* Discovery log */}
          <div
            ref={logRef}
            className="w-full overflow-hidden"
            style={{
              height: '120px',
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
            }}
          >
            <div className="space-y-2.5 px-1 pt-4">
              {displayedLines.map((line, i) => (
                <p key={i}
                  className="text-[14px] font-serif text-left leading-relaxed"
                  style={{
                    color: '#F5ECD7',
                    opacity: Math.max(0.15, (i + 1) / (displayedLines.length + 1) * 0.5),
                  }}>
                  {line}
                </p>
              ))}
              {currentText && (
                <p className="text-[14px] font-serif text-left leading-relaxed"
                  style={{ color: '#F5ECD7CC' }}>
                  {currentText}
                  <span
                    className="inline-block w-[2px] h-3 ml-0.5 align-middle animate-pulse"
                    style={{ background: currentStage.color }}
                  />
                </p>
              )}
            </div>
          </div>

          {/* Stage dots — minimal */}
          <div className="flex items-center gap-2.5">
            {STAGE_CONFIG.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-700"
                style={{
                  width: i === stage ? 28 : 6,
                  height: 6,
                  background: i < stage
                    ? `${currentStage.color}50`
                    : i === stage
                      ? currentStage.color
                      : '#F5ECD715',
                }}
              />
            ))}
          </div>

          {/* Thin glow bar */}
          <div className="w-full h-px rounded-full overflow-hidden"
            style={{ background: '#F5ECD710' }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${currentStage.color}50, ${currentStage.color})`,
                boxShadow: `0 0 6px ${currentStage.color}`,
              }}
              animate={{ width: `${((stage + 1) / STAGE_CONFIG.length) * 100}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>

          {/* Ambient quote */}
          <p
            className="text-center text-[11px] font-serif italic transition-all duration-700"
            style={{
              color: '#F5ECD728',
              opacity: showAmbient ? 1 : 0,
              transform: showAmbient ? 'translateY(0)' : 'translateY(4px)',
            }}>
            {AMBIENT_LINES[ambientIdx]}
          </p>

        </motion.div>
      </AnimatePresence>
      <style>{`@keyframes breathe { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.5); opacity: 1; } }`}</style>
    </div>
  );
};

export default ProgressOverlay;
