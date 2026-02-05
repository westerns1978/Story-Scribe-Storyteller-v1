
import { MusicTrack } from '../types';
import { getConnectivitySettings } from './connectivityService';

const PIXABAY_MUSIC_API_URL = 'https://pixabay.com/api/music/';

// Internal type for pre-loaded tracks with searchable keywords
interface BensoundTrackData extends MusicTrack {
    keywords: string[];
}

// 10 pre-loaded Bensound tracks that work without an API key
const BENSOUND_TRACKS: BensoundTrackData[] = [
    { id: 101, title: 'Memories', artist: 'Bensound', duration: 219, url: 'https://www.bensound.com/bensound-music/bensound-memories.mp3', keywords: ['nostalgic', 'emotional', 'piano', 'reflective', 'sentimental'] },
    { id: 102, title: 'Slow Motion', artist: 'Bensound', duration: 209, url: 'https://www.bensound.com/bensound-music/bensound-slowmotion.mp3', keywords: ['calm', 'peaceful', 'cinematic', 'slow'] },
    { id: 103, title: 'The Jazz Piano', artist: 'Bensound', duration: 169, url: 'https://www.bensound.com/bensound-music/bensound-thejazzpiano.mp3', keywords: ['jazz', 'elegant', 'vintage', 'classy', 'lounge'] },
    { id: 104, title: 'Once Again', artist: 'Bensound', duration: 231, url: 'https://www.bensound.com/bensound-music/bensound-onceagain.mp3', keywords: ['hopeful', 'inspiring', 'uplifting', 'motivational'] },
    { id: 105, title: 'Sweet', artist: 'Bensound', duration: 132, url: 'https://www.bensound.com/bensound-music/bensound-sweet.mp3', keywords: ['romantic', 'tender', 'love', 'gentle', 'soft'] },
    { id: 106, title: 'Tomorrow', artist: 'Bensound', duration: 282, url: 'https://www.bensound.com/bensound-music/bensound-tomorrow.mp3', keywords: ['optimistic', 'bright', 'future', 'positive', 'corporate'] },
    { id: 107, title: 'Tenderness', artist: 'Bensound', duration: 123, url: 'https://www.bensound.com/bensound-music/bensound-tenderness.mp3', keywords: ['soft', 'emotional', 'piano', 'gentle'] },
    { id: 108, title: 'Acoustic Breeze', artist: 'Bensound', duration: 159, url: 'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3', keywords: ['acoustic', 'light', 'happy', 'folk', 'breeze'] },
    { id: 109, title: 'November', artist: 'Bensound', duration: 213, url: 'https://www.bensound.com/bensound-music/bensound-november.mp3', keywords: ['melancholic', 'reflective', 'sad', 'piano', 'november'] },
    { id: 110, title: 'A Day To Remember', artist: 'Bensound', duration: 154, url: 'https://www.bensound.com/bensound-music/bensound-adaytoremember.mp3', keywords: ['cinematic', 'epic', 'orchestral', 'inspiring', 'motivational'] },
];

/**
 * Filters the pre-loaded Bensound tracks by keywords.
 * @param query The search query string.
 * @returns An array of matching MusicTrack objects.
 */
const searchBensound = (query: string): MusicTrack[] => {
    if (!query) return [];
    const queryKeywords = query.toLowerCase().split(/[\s,]+/).filter(Boolean);
    if (queryKeywords.length === 0) {
        return [];
    }

    const results = BENSOUND_TRACKS.filter(track => {
        const trackText = `${track.title.toLowerCase()} ${track.keywords.join(' ')}`;
        return queryKeywords.some(kw => trackText.includes(kw));
    });

    // Strip the internal `keywords` property before returning
    return results.map(({ keywords, ...rest }) => rest);
};

/**
 * Searches the Pixabay API for music tracks.
 * @param suggestion The search query string.
 * @param apiKey The Pixabay API key.
 * @returns A promise that resolves to an array of MusicTrack objects.
 */
const searchPixabay = async (suggestion: string, apiKey: string): Promise<MusicTrack[]> => {
    const keywords = suggestion.trim().split(' ').join('+');
    const url = `${PIXABAY_MUSIC_API_URL}?key=${apiKey}&q=${encodeURIComponent(keywords)}&per_page=10`;

    try {
        const response = await fetch(url);
        
        // If 404 or other error, return empty to fallback gracefully without logging explicit console error
        if (!response.ok) {
            return []; 
        }

        const data = await response.json();

        if (data.hits && data.hits.length > 0) {
            return data.hits.map((hit: any): MusicTrack => ({
                id: hit.id,
                title: hit.title,
                artist: hit.user.name,
                duration: hit.duration,
                url: hit.previewURL,
            }));
        }
    } catch (error) {
        // Suppress network errors for Pixabay to allow silent fallback
        return [];
    }

    return [];
};

/**
 * Finds music based on a suggestion, prioritizing pre-loaded tracks,
 * then falling back to Pixabay API, and finally returning all pre-loaded tracks.
 * This function is designed to never throw an error and always return music.
 * @param suggestion A string containing keywords for the music search.
 * @returns A promise that resolves to an array of MusicTrack objects.
 */
export const findMusicFromSuggestion = async (suggestion: string): Promise<MusicTrack[]> => {
    // 1. First, search the pre-loaded Bensound tracks for instant results.
    const bensoundResults = searchBensound(suggestion);
    if (bensoundResults.length > 0) {
        return bensoundResults;
    }

    // 2. If no pre-loaded tracks match, try the Pixabay API as a backup.
    const { pixabayApiKey } = getConnectivitySettings();
    if (pixabayApiKey) {
        const pixabayResults = await searchPixabay(suggestion, pixabayApiKey);
        if (pixabayResults.length > 0) {
            return pixabayResults;
        }
    }

    // 3. If both searches fail or return no results, return all Bensound tracks as a reliable fallback.
    return BENSOUND_TRACKS.map(({ keywords, ...rest }) => rest);
};
