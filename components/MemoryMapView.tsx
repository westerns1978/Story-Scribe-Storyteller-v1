import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ActiveStory } from '../../types';

// ─── Inline icons ──────────────────────────────────────────────────────────────
const MapPinIcon: React.FC<{className?:string}> = ({className=''}) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/>
  </svg>
);
const SparklesIcon: React.FC<{className?:string}> = ({className=''}) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"/>
  </svg>
);

interface LocationPin {
  name: string;
  type: string;
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: boolean;
}

// Geocode a location name using Nominatim (free, no API key)
async function geocodeLocation(name: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(name);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'StoryScribe/1.0' } }
    );
    const data = await res.json();
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

// Build a Google Maps Static API URL showing all pins
// Falls back to OpenStreetMap embed if no API key
function buildMapUrl(pins: LocationPin[], selectedIndex: number | null): string {
  const validPins = pins.filter(p => p.lat !== null && p.lng !== null);
  if (validPins.length === 0) return '';

  // Use OpenStreetMap / Leaflet-style embed via iframe
  // We'll build it as a Google Maps directions/search URL that shows markers
  if (selectedIndex !== null && pins[selectedIndex]?.lat) {
    const p = pins[selectedIndex];
    return `https://maps.google.com/maps?q=${p.lat},${p.lng}&z=13&output=embed&hl=en`;
  }

  // Show all pins — center on average
  const avgLat = validPins.reduce((s, p) => s + p.lat!, 0) / validPins.length;
  const avgLng = validPins.reduce((s, p) => s + p.lng!, 0) / validPins.length;

  // Build a markers string for Google Maps embed
  const markerParams = validPins.map(p =>
    `markers=color:red%7C${p.lat},${p.lng}`
  ).join('&');

  return `https://maps.google.com/maps?q=${avgLat},${avgLng}&z=5&output=embed&hl=en&${markerParams}`;
}

const MemoryMapView: React.FC<{ story: ActiveStory | null }> = ({ story }) => {
  const [pins, setPins] = useState<LocationPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const geocodedRef = useRef(false);

  const rawLocations = useMemo(() =>
    story?.extraction?.locations || [], [story]);

  const timeline = useMemo(() => {
    const events = story?.extraction?.timeline || [];
    return [...events].sort((a, b) => {
      const ya = parseInt(String(a.year), 10);
      const yb = parseInt(String(b.year), 10);
      if (!isNaN(ya) && !isNaN(yb)) return ya - yb;
      return String(a.year || '').localeCompare(String(b.year || ''));
    });
  }, [story]);

  // Init pins from raw locations, then geocode
  useEffect(() => {
    if (!rawLocations.length || geocodedRef.current) return;
    geocodedRef.current = true;

    const initialPins: LocationPin[] = rawLocations.map(loc => ({
      name: loc.name || '',
      type: loc.type || '',
      lat: null,
      lng: null,
      loading: true,
      error: false,
    }));
    setPins(initialPins);

    // Geocode each location with stagger to respect rate limits
    rawLocations.forEach((loc, i) => {
      setTimeout(async () => {
        const coords = await geocodeLocation(loc.name || '');
        setPins(prev => {
          const updated = [...prev];
          if (coords) {
            updated[i] = { ...updated[i], lat: coords.lat, lng: coords.lng, loading: false };
          } else {
            updated[i] = { ...updated[i], loading: false, error: true };
          }
          return updated;
        });
      }, i * 600); // 600ms stagger — Nominatim rate limit is 1/sec
    });
  }, [rawLocations]);

  if (!story) return null;

  const mapUrl = buildMapUrl(pins, selectedPin);
  const validPins = pins.filter(p => p.lat !== null);
  const hasMap = validPins.length > 0;

  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: '#0a0909' }}
    >
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* Header */}
        <header className="text-center">
          <span className="text-heritage-burgundy/70 font-black tracking-[0.4em] uppercase text-[10px] mb-3 block">
            Life Map
          </span>
          <h2 className="text-4xl font-display font-black text-white tracking-tight mb-2">
            {story.storytellerName}'s World
          </h2>
          <p className="text-white/30 font-serif italic text-sm">
            {rawLocations.length} {rawLocations.length === 1 ? 'place' : 'places'} that shaped this life
          </p>
          <div className="w-16 h-px bg-heritage-burgundy/30 mx-auto mt-3" />
        </header>

        {/* ── Map + Pins layout ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Map iframe */}
          <div className="lg:col-span-2 relative rounded-2xl overflow-hidden"
            style={{ height: '420px', background: '#1a1208' }}>
            {hasMap ? (
              <>
                {!mapLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-2 border-heritage-warmGold/30 border-t-heritage-warmGold/80 rounded-full animate-spin" />
                    <p className="text-white/30 text-xs font-serif italic">Loading map...</p>
                  </div>
                )}
                <iframe
                  key={selectedPin ?? 'all'}
                  src={mapUrl}
                  className="w-full h-full border-0"
                  style={{ opacity: mapLoaded ? 1 : 0, transition: 'opacity 0.4s' }}
                  onLoad={() => setMapLoaded(true)}
                  title="Life Map"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                {/* Overlay gradient at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, #0a0909 0%, transparent 100%)' }} />
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                {pins.some(p => p.loading) ? (
                  <>
                    <div className="w-8 h-8 border-2 border-heritage-warmGold/30 border-t-heritage-warmGold/80 rounded-full animate-spin" />
                    <p className="text-white/30 text-xs font-serif italic">Locating places...</p>
                  </>
                ) : (
                  <>
                    <MapPinIcon className="w-10 h-10 text-white/10" />
                    <p className="text-white/20 font-serif italic text-sm">No locations found in this story</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Location list sidebar */}
          <div className="space-y-2 lg:overflow-y-auto" style={{ maxHeight: '420px' }}>
            {pins.length === 0 && (
              <div className="text-white/20 font-serif italic text-sm p-4 text-center">
                No locations extracted
              </div>
            )}
            {pins.map((pin, i) => (
              <button
                key={i}
                onClick={() => {
                  if (pin.lat !== null) {
                    setSelectedPin(selectedPin === i ? null : i);
                    setMapLoaded(false);
                  }
                }}
                className="w-full text-left rounded-xl px-4 py-3 transition-all flex items-center gap-3"
                style={{
                  background: selectedPin === i
                    ? 'rgba(196,151,59,0.12)'
                    : 'rgba(255,255,255,0.03)',
                  border: selectedPin === i
                    ? '1px solid rgba(196,151,59,0.3)'
                    : '1px solid rgba(255,255,255,0.06)',
                  opacity: pin.error ? 0.4 : 1,
                  cursor: pin.lat !== null ? 'pointer' : 'default',
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: selectedPin === i
                      ? 'rgba(196,151,59,0.25)'
                      : 'rgba(139,46,59,0.2)',
                  }}
                >
                  {pin.loading ? (
                    <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                  ) : (
                    <MapPinIcon className="w-4 h-4"
                      style={{ color: selectedPin === i ? 'rgba(196,151,59,0.9)' : 'rgba(139,46,59,0.8)' }} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white/80 font-serif text-sm font-semibold truncate">{pin.name}</p>
                  <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mt-0.5">{pin.type}</p>
                </div>
                {pin.lat !== null && (
                  <div className="ml-auto flex-shrink-0 text-white/20 text-xs">
                    {selectedPin === i ? '▼' : '▶'}
                  </div>
                )}
              </button>
            ))}
            {selectedPin !== null && (
              <button
                onClick={() => { setSelectedPin(null); setMapLoaded(false); }}
                className="w-full text-center text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white/40 py-2 transition-colors"
              >
                ← Show all places
              </button>
            )}
          </div>
        </div>

        {/* ── Timeline ──────────────────────────────────────────────── */}
        {timeline.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/25">Life Timeline</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {timeline.map((event, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-5 transition-all group"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(139,46,59,0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-heritage-burgundy font-mono font-black text-xl tracking-tighter">
                      {event?.year || ''}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-heritage-burgundy opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h4 className="text-white font-display font-bold text-base tracking-tight mb-2 leading-snug">
                    {event?.event || ''}
                  </h4>
                  {event?.significance && (
                    <p className="text-white/40 text-xs font-serif italic leading-relaxed mb-2">
                      "{event.significance}"
                    </p>
                  )}
                  {event?.historical_context && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                      <SparklesIcon className="w-3 h-3 text-heritage-warmGold/40 flex-shrink-0 mt-0.5" />
                      <p className="text-white/25 text-[10px] leading-relaxed italic">
                        {event.historical_context}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryMapView;
