import React, { useState } from 'react';
import { StoryArchiveItem } from '../../types';
import ConnectionFinderModal from '../../components/ConnectionFinderModal';

interface StoriesShelfProps {
  stories: StoryArchiveItem[];
  onSelectStory: (sessionId: string) => void;
  onNewStory: () => void;
  onBack: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function getThemeColor(name: string): string {
  const colors = ['#8B2E3B','#C4973B','#7A8B6F','#5C4F3D','#4A6741','#7B4F6E','#3B6B8B','#8B6B3B','#6B3B8B','#3B8B6B'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

export const StoriesShelf: React.FC<StoriesShelfProps> = ({
  stories, onSelectStory, onNewStory, onBack, onRefresh, isRefreshing = false,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);

  return (
    <div className="h-full w-full overflow-y-auto animate-fade-in relative" style={{ background: 'linear-gradient(180deg, #1A1208 0%, #0D0B0A 100%)' }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-heritage-warmGold/10 blur-[80px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <button onClick={onBack} className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 hover:text-white/60 transition-colors mb-4 block mx-auto">← Back</button>
          <img src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Wissums_Logo_Red_Version.png" className="w-10 mx-auto opacity-70" alt="Wissums" />
          <h1 className="text-3xl font-display font-black text-white tracking-tight">The Family <span className="text-heritage-warmGold">Archive</span></h1>
          <div className="flex items-center justify-center gap-4">
            <p className="text-white/40 font-serif italic text-sm">{stories.length} {stories.length === 1 ? 'legacy' : 'legacies'} preserved</p>
            {onRefresh && (
              <button onClick={onRefresh} disabled={isRefreshing} className="text-white/20 hover:text-white/50 transition-colors text-xs" title="Refresh">
                <span className={isRefreshing ? 'inline-block animate-spin' : ''}>↻</span>
              </button>
            )}
            {stories.length >= 2 && (
              <button
                onClick={() => setIsConnectionsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105"
                style={{ background: 'rgba(196,151,59,0.1)', border: '1px solid rgba(196,151,59,0.3)', color: 'rgba(196,151,59,0.8)' }}
                title="Find connections between stories"
              >
                🔗 Find Connections
              </button>
            )}
          </div>
        </div>

        {/* Shelf */}
        {stories.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <div className="text-6xl opacity-20">📚</div>
            <p className="text-white/30 font-serif italic">No stories yet. Begin the first one.</p>
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden p-6 pb-10" style={{ background: 'linear-gradient(180deg, #2C1F0E 0%, #1A1208 60%, #3D2810 100%)', boxShadow: 'inset 0 -6px 20px rgba(0,0,0,0.5), inset 0 6px 20px rgba(0,0,0,0.3)' }}>
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px)' }} />
            <div className="absolute bottom-0 left-0 right-0 h-6 z-10" style={{ background: 'linear-gradient(180deg, #5C3A14 0%, #3D2810 100%)', boxShadow: '0 4px 12px rgba(0,0,0,0.6)' }} />

            <div className="flex flex-wrap gap-3 justify-start items-end relative z-20 pb-4">
              {stories.map((story) => {
                const color = getThemeColor(story.storytellerName);
                const initials = getInitials(story.storytellerName);
                const isHovered = hoveredId === story.sessionId;
                const coverImage = story.generatedImages?.[0]?.image_url || null;
                return (
                  <button
                    key={story.sessionId}
                    onClick={() => onSelectStory(story.sessionId)}
                    onMouseEnter={() => setHoveredId(story.sessionId)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="group relative flex-shrink-0 transition-all duration-300 focus:outline-none"
                    style={{ transform: isHovered ? 'translateY(-16px) scale(1.05)' : 'translateY(0) scale(1)' }}
                    title={story.storytellerName}
                  >
                    <div className="relative overflow-hidden rounded-t-sm" style={{ width: '72px', height: `${140 + (story.storytellerName.length % 3) * 20}px`, background: coverImage ? 'transparent' : `linear-gradient(135deg, ${color}ee 0%, ${color}99 100%)`, boxShadow: isHovered ? '6px 6px 20px rgba(0,0,0,0.7), -2px 0 8px rgba(0,0,0,0.4), inset -3px 0 8px rgba(0,0,0,0.3)' : '3px 3px 10px rgba(0,0,0,0.5), -1px 0 4px rgba(0,0,0,0.3), inset -2px 0 4px rgba(0,0,0,0.2)' }}>
                      {coverImage && <img src={coverImage} alt={story.storytellerName} className="absolute inset-0 w-full h-full object-cover opacity-80" />}
                      <div className="absolute inset-0" style={{ background: coverImage ? `linear-gradient(180deg, ${color}88 0%, ${color}dd 100%)` : 'transparent' }} />
                      <div className="absolute left-0 top-0 bottom-0 w-2" style={{ background: 'rgba(0,0,0,0.3)' }} />
                      {!coverImage && <div className="absolute inset-0 flex items-center justify-center"><div className="text-white/30 font-black text-3xl" style={{ fontFamily: 'Georgia, serif' }}>{initials}</div></div>}
                      <div className="absolute inset-0 flex items-end justify-center pb-4 px-1">
                        <div className="text-white font-black text-[8px] uppercase tracking-widest text-center leading-tight" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                          {story.storytellerName.split(' ').map((word, i) => <div key={i}>{word}</div>)}
                        </div>
                      </div>
                      {isHovered && <div className="absolute inset-0 bg-white/10 pointer-events-none" />}
                    </div>
                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30 pointer-events-none" style={{ minWidth: '170px', maxWidth: '210px' }}>
                        <div className="bg-[#1A1208] border border-heritage-warmGold/30 rounded-xl px-4 py-3 text-center shadow-2xl">
                          <div className="text-white font-black text-[10px] uppercase tracking-wider">{story.storytellerName}</div>
                          <div className="text-white/40 text-[9px] mt-0.5">{formatDate(story.savedAt || '')}</div>
                          {story.narrative && <div className="text-white/50 text-[9px] mt-2 font-serif italic leading-relaxed border-t border-white/10 pt-2">{story.narrative.slice(0, 80).replace(/\s\S+$/, '') + '…'}</div>}
                          {(story.generatedImages?.length || 0) > 0 && <div className="text-heritage-warmGold/50 text-[8px] mt-1.5 font-black uppercase tracking-widest">{story.generatedImages!.length} scenes</div>}
                          <div className="text-heritage-warmGold/70 text-[9px] mt-1.5 font-serif italic">▶ Watch legacy</div>
                        </div>
                        <div className="w-2 h-2 bg-[#1A1208] border-r border-b border-heritage-warmGold/30 mx-auto -mt-1 rotate-45" />
                      </div>
                    )}
                  </button>
                );
              })}

              <button onClick={onNewStory} className="group relative flex-shrink-0 transition-all duration-300 hover:-translate-y-4" title="Preserve a new legacy">
                <div className="relative rounded-t-sm border-2 border-dashed border-white/20 hover:border-heritage-warmGold/50 transition-colors flex flex-col items-center justify-center gap-2" style={{ width: '72px', height: '160px' }}>
                  <div className="text-white/20 group-hover:text-heritage-warmGold/60 text-3xl transition-colors">+</div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover:text-heritage-warmGold/60 transition-colors text-center px-1 leading-tight">New Story</div>
                </div>
              </button>
            </div>
          </div>
        )}

        <div className="text-center">
          <button onClick={onNewStory} className="px-10 py-4 bg-heritage-burgundy text-white font-black rounded-full shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.3em]">
            Preserve a New Legacy
          </button>
        </div>
      </div>

      <ConnectionFinderModal isOpen={isConnectionsOpen} onClose={() => setIsConnectionsOpen(false)} stories={stories} />
    </div>
  );
};
