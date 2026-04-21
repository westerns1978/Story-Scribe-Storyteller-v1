// utils/nameUtils.ts
// ─────────────────────────────────────────────────────────────────────────────
// Normalize `storyteller_name` for display across every scene overlay.
// Raw DB values arrive in many forms:
//   "BILL COURTNEY"
//   "bill courtney"
//   "Bill Courtney (1954-2024)"
//   "Bill Courtney  1954 - 2024"
//   "  bill  courtney  "
// The cinematic overlays must always show a single clean title-case form
// ("Bill Courtney") — no all-caps, no birth years, no stray parentheticals.
// ─────────────────────────────────────────────────────────────────────────────

const PARTICLES = new Set([
  'de', 'la', 'le', 'van', 'von', 'der', 'den', 'bin', 'al',
  'del', 'di', 'da', 'du', 'el', 'ter', 'ten', 'bint', 'ben',
]);

function titleWord(word: string, isFirst: boolean, isLast: boolean): string {
  if (!word) return word;
  const lower = word.toLowerCase();

  // Lowercase particles when not the first word (e.g. "de la Vega")
  if (!isFirst && PARTICLES.has(lower)) return lower;

  // Mc-prefix — McDonald, McCoy
  if (/^mc[a-z]/i.test(word) && word.length > 2) {
    return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
  }

  // Mac-prefix — MacMillan (but not "Mack", "Macy" which are ordinary surnames)
  if (/^mac[a-z]/i.test(word) && word.length > 4 && !/^(mack|macy|macon|macro)/i.test(word)) {
    return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
  }

  // Apostrophe-prefix — O'Brien, D'Amato
  if (/^[a-z]'[a-z]/i.test(word)) {
    return word.charAt(0).toUpperCase() + "'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
  }

  // Hyphenated compounds — Jean-Luc, Anne-Marie
  if (word.includes('-')) {
    return word.split('-').map(p => p ? titleWord(p, true, false) : p).join('-');
  }

  // Initials with periods — J.R., W.E.B.
  if (/^[a-z](\.[a-z])+\.?$/i.test(word)) return word.toUpperCase();

  // Roman numerals at end of name — John Smith III
  if (isLast && /^[ivxlcdm]+$/i.test(word) && word.length <= 4 && word.length >= 2) {
    return word.toUpperCase();
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Normalize a raw storyteller name for display.
 *
 * Strips:
 *   - Any (parenthesized) suffix — birth years, notes, aliases
 *   - Trailing year ranges like "1954-2024", "1954 –"
 *   - Single trailing year
 * Applies:
 *   - Consistent title case (with particle/Mc/apostrophe/roman-numeral support)
 *   - Whitespace collapse
 */
export function formatDisplayName(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = String(raw).trim();

  // Strip any parenthetical suffix — "Bill Courtney (1954-2024)" → "Bill Courtney"
  s = s.replace(/\s*\([^)]*\)\s*/g, ' ');

  // Strip trailing "1954 - 2024" or "1954–"
  s = s.replace(/\s+\d{4}\s*[-–—]\s*\d{0,4}\s*$/, '');

  // Strip trailing 4-digit year (legacy)
  s = s.replace(/\s+\d{4}\s*$/, '');

  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();

  if (!s) return '';

  const words = s.split(' ');
  return words.map((w, i) => titleWord(w, i === 0, i === words.length - 1)).join(' ');
}

/**
 * Same as formatDisplayName, but falls back to a provided default when the
 * input is empty. Handy for hero overlays where a blank string would collapse
 * the layout.
 */
export function formatDisplayNameOrDefault(
  raw: string | null | undefined,
  fallback = 'A Life Well Lived',
): string {
  const formatted = formatDisplayName(raw);
  return formatted || fallback;
}
