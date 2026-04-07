// utils/brandUtils.ts
// ============================================
// Domain-aware branding for the shared codebase.
// Wissums (pet memorials) and Story Scribe (human life stories)
// share one repo — this helper gates behaviour by hostname.
// ============================================

export const isWissums = typeof window !== 'undefined'
  && window.location.hostname.includes('wissums');

export const BRAND = isWissums
  ? { name: 'Wissums', tagline: 'Preserve your pet\'s story forever.' }
  : { name: 'Story Scribe', tagline: 'Preserve life stories forever.' };

export const CONNIE_PORTRAIT = isWissums
  ? 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/wissums/connie-ai.png'
  : 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/connie-ai.png';
