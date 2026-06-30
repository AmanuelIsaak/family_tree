import type { FriendLevel } from './types';

export interface LevelMeta {
  level: FriendLevel;
  label: string;
  short: string;
  description: string;
  /** Tailwind color token (see tailwind.config.js) and a raw hex for SVG/inline use. */
  color: string;
  hex: string;
}

/** The seven concentric tiers, from closest (1) to most distant (7). */
export const LEVELS: LevelMeta[] = [
  {
    level: 1,
    label: 'Inner Circle',
    short: 'Inner',
    description: 'The handful of people you trust with anything.',
    color: 'lvl1',
    hex: '#ef4444',
  },
  {
    level: 2,
    label: 'Close Friends',
    short: 'Close',
    description: 'People you see often and lean on.',
    color: 'lvl2',
    hex: '#f97316',
  },
  {
    level: 3,
    label: 'Good Friends',
    short: 'Good',
    description: 'Solid friendships you keep up with.',
    color: 'lvl3',
    hex: '#eab308',
  },
  {
    level: 4,
    label: 'Friends',
    short: 'Friends',
    description: 'People you genuinely enjoy.',
    color: 'lvl4',
    hex: '#22c55e',
  },
  {
    level: 5,
    label: 'Buddies',
    short: 'Buddies',
    description: 'Context friends — gym, hobby, a shared scene.',
    color: 'lvl5',
    hex: '#06b6d4',
  },
  {
    level: 6,
    label: 'Acquaintances',
    short: 'Acq.',
    description: 'Friendly faces you know by name.',
    color: 'lvl6',
    hex: '#6366f1',
  },
  {
    level: 7,
    label: 'Distant',
    short: 'Distant',
    description: 'People drifting in or out of your orbit.',
    color: 'lvl7',
    hex: '#a855f7',
  },
];

const byLevel = new Map<FriendLevel, LevelMeta>(LEVELS.map((l) => [l.level, l]));

export function levelMeta(level: FriendLevel): LevelMeta {
  return byLevel.get(level) ?? LEVELS[LEVELS.length - 1];
}
