import type { Friend } from './types';

export interface Era {
  id: string;
  label: string;
  /** Inclusive start year; null = open-ended (everything before `to`). */
  from: number | null;
  /** Inclusive end year; null = ongoing (up to the current year). */
  to: number | null;
  /** Short caption under the era heading. */
  blurb: string;
}

/**
 * Chapters of your life, oldest first. A friend lands in every era their
 * friendship *span* (met → last contact) overlaps, so ongoing friends repeat
 * across eras while drifted-apart ones stay behind in the earlier chapters.
 *
 * Edit these boundaries freely — the Eras view derives everything from them.
 */
export const ERAS: Era[] = [
  { id: 'until-2017', label: 'Until 2017', from: null, to: 2017, blurb: 'The early chapters.' },
  { id: '2018-2021', label: '2018 – 2021', from: 2018, to: 2021, blurb: 'The middle stretch.' },
  { id: '2022-now', label: '2022 – Now', from: 2022, to: null, blurb: 'Who’s around today.' },
];

const NOW_YEAR = new Date().getFullYear();

function yearOf(date: string): number | null {
  if (!date) return null;
  const y = Number(date.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

/** The [start, end] year span of a friendship. A missing last contact ⇒ ongoing. */
export function friendSpan(f: Friend): { start: number; end: number } | null {
  const start = yearOf(f.metDate);
  if (start === null) return null;
  const end = yearOf(f.lastContact) ?? NOW_YEAR;
  return { start, end: Math.max(start, end) };
}

/** True if the friendship's active span overlaps the era's year range. */
export function overlapsEra(f: Friend, era: Era): boolean {
  const span = friendSpan(f);
  if (!span) return false;
  const from = era.from ?? -Infinity;
  const to = era.to ?? Infinity;
  return span.start <= to && span.end >= from;
}

/** How many of the given eras a friend spans — 1 means they belong to a single chapter. */
export function eraCount(f: Friend): number {
  return ERAS.reduce((n, era) => (overlapsEra(f, era) ? n + 1 : n), 0);
}

/** Still in touch recently ⇒ they carry through to today. */
export function isOngoing(f: Friend): boolean {
  const span = friendSpan(f);
  return !!span && span.end >= NOW_YEAR - 1;
}
