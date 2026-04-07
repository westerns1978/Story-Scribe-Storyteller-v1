import React, { useState } from 'react';

interface TimelineEvent {
  year: string;
  event: string;
  significance?: string;
  historical_context?: string;
  evocative_narration?: string;
}

interface GeneratedImage {
  image_url?: string;
  beat_title?: string;
  image_index?: number;
}

interface TimelineVisualizerProps {
  timeline: TimelineEvent[];
  images?: GeneratedImage[];
}

const TimelineVisualizer: React.FC<TimelineVisualizerProps> = ({ timeline, images = [] }) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!timeline || timeline.length === 0) return null;

  // Try to match a storyboard image to a timeline event by year mention
  const getImageForEvent = (event: TimelineEvent): string | null => {
    if (!images.length) return null;
    const yearStr = event.year?.toString();
    const img = images.find(img =>
      img.beat_title?.includes(yearStr) ||
      img.beat_title?.toLowerCase().includes(event.event?.slice(0, 15).toLowerCase())
    );
    return img?.image_url || null;
  };

  return (
    <div className="relative">
      {/* Vertical spine */}
      <div
        className="absolute left-[28px] top-0 bottom-0 w-px"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(139,46,59,0.3) 10%, rgba(139,46,59,0.3) 90%, transparent)' }}
      />

      <div className="space-y-0">
        {timeline.map((item, i) => {
          const img = getImageForEvent(item);
          const isExpanded = expanded === i;

          return (
            <div
              key={i}
              className="relative flex gap-6 group cursor-pointer"
              onClick={() => setExpanded(isExpanded ? null : i)}
            >
              {/* Year node */}
              <div className="flex-shrink-0 flex flex-col items-center" style={{ width: '56px' }}>
                <div
                  className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 mt-4"
                  style={{
                    background: isExpanded ? '#8B2E3B' : '#F2EAE0',
                    borderColor: '#8B2E3B',
                    boxShadow: isExpanded ? '0 0 0 4px rgba(139,46,59,0.15)' : 'none',
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full transition-all"
                    style={{ background: isExpanded ? '#F2EAE0' : '#8B2E3B' }}
                  />
                </div>
              </div>

              {/* Content */}
              <div
                className="flex-1 py-4 pr-4 border-b transition-all"
                style={{ borderColor: 'rgba(139,46,59,0.08)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: '#C4973B' }}
                    >
                      {item.year}
                    </span>
                    <p
                      className="text-sm font-serif leading-snug mt-0.5"
                      style={{ color: '#2C2418' }}
                    >
                      {item.event}
                    </p>
                    {/* Historical context — always visible */}
                    {item.historical_context && (
                      <p className="text-[11px] leading-relaxed mt-1.5" style={{ color: '#8A7E6D', fontStyle: 'italic' }}>
                        <span style={{ marginRight: 4 }}>🌍</span>{item.historical_context}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-[10px] transition-transform duration-200 mt-1 flex-shrink-0"
                    style={{
                      color: 'rgba(139,46,59,0.4)',
                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                    }}
                  >
                    ›
                  </span>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-4 space-y-3 animate-fade-in">
                    {img && (
                      <div className="rounded-2xl overflow-hidden" style={{ maxHeight: '200px' }}>
                        <img
                          src={img}
                          alt={item.event}
                          className="w-full h-full object-cover"
                          style={{ maxHeight: '200px' }}
                        />
                      </div>
                    )}
                    {/* Evocative narration */}
                    {item.evocative_narration && (
                      <div
                        className="rounded-xl p-4"
                        style={{ background: 'rgba(44,36,24,0.04)', border: '1px solid rgba(44,36,24,0.1)' }}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const { narrateAndPlay } = await import('../services/narrationService');
                                narrateAndPlay(item.evocative_narration!.slice(0, 400));
                              } catch {}
                            }}
                            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                            style={{ background: 'rgba(139,46,59,0.1)', border: '1px solid rgba(139,46,59,0.2)' }}
                            title="Listen to narration"
                          >
                            <span style={{ fontSize: 12, color: '#8B2E3B' }}>🔊</span>
                          </button>
                          <p className="text-xs font-serif italic leading-relaxed" style={{ color: '#5C4F3D' }}>
                            "{item.evocative_narration}"
                          </p>
                        </div>
                      </div>
                    )}
                    {item.significance && (
                      <div
                        className="rounded-xl p-4"
                        style={{ background: 'rgba(139,46,59,0.05)', border: '1px solid rgba(139,46,59,0.1)' }}
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#8B2E3B' }}>
                          Significance
                        </p>
                        <p className="text-xs font-serif italic leading-relaxed" style={{ color: '#5C4F3D' }}>
                          {item.significance}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineVisualizer;
