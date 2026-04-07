// utils/brandUtils.ts
// ============================================
// Domain-aware branding for the shared codebase.
// Wissums (pet memorials) and Story Scribe (human life stories)
// share one repo — this helper gates behaviour by hostname.
// ============================================

export const isWissums = typeof window !== 'undefined'
  && window.location.hostname.includes('wissums');

export const WISSUMS_BG = 'https://storage.googleapis.com/gemynd-public/projects/wissums/wissum-background.png';
export const WISSUMS_PORTRAIT = 'https://storage.googleapis.com/gemynd-public/projects/wissums/sissy.jpg';

export const BRAND = isWissums
  ? { name: 'Wissums', tagline: 'Preserve your pet\'s story forever.', agentName: 'Sissy' }
  : { name: 'Story Scribe', tagline: 'Preserve life stories forever.', agentName: 'Connie' };

export const CONNIE_PORTRAIT = isWissums
  ? WISSUMS_PORTRAIT
  : 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/connie-ai.png';
