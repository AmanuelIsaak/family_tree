import { writable, derived, get } from 'svelte/store';
import type { Friend, FriendLevel, Theme, View } from './types';
import { SAMPLE_FRIENDS } from './sampleData';

const FRIENDS_KEY = 'mycircle:friends';
const THEME_KEY = 'mycircle:theme';

function loadFriends(): Friend[] {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    if (raw) return JSON.parse(raw) as Friend[];
  } catch {
    /* ignore corrupt storage */
  }
  return SAMPLE_FRIENDS;
}

export const friends = writable<Friend[]>(loadFriends());

friends.subscribe((list) => {
  try {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(list));
  } catch {
    /* storage may be unavailable */
  }
});

// ── UI state ────────────────────────────────────────────────────────────────
export const view = writable<View>('circles');
export const search = writable('');
/** Set of levels currently shown. Empty filter shown as "all". */
export const levelFilter = writable<Set<FriendLevel>>(new Set());

export const filteredFriends = derived(
  [friends, search, levelFilter],
  ([$friends, $search, $levelFilter]) => {
    const q = $search.trim().toLowerCase();
    return $friends.filter((f) => {
      if ($levelFilter.size > 0 && !$levelFilter.has(f.level)) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.metAt.toLowerCase().includes(q) ||
        (f.city ?? '').toLowerCase().includes(q) ||
        (f.country ?? '').toLowerCase().includes(q) ||
        f.notes.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  },
);

// ── Mutations ────────────────────────────────────────────────────────────────
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export type FriendDraft = Omit<Friend, 'id' | 'createdAt'>;

export function addFriend(draft: FriendDraft): Friend {
  const friend: Friend = { ...draft, id: uid(), createdAt: new Date().toISOString() };
  friends.update((list) => [...list, friend]);
  return friend;
}

export function updateFriend(id: string, patch: Partial<FriendDraft>): void {
  friends.update((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
}

export function removeFriend(id: string): void {
  friends.update((list) => list.filter((f) => f.id !== id));
}

export function toggleFavorite(id: string): void {
  friends.update((list) =>
    list.map((f) => (f.id === id ? { ...f, favorite: !f.favorite } : f)),
  );
}

// ── Import / export ──────────────────────────────────────────────────────────
export function exportJSON(): string {
  return JSON.stringify(get(friends), null, 2);
}

export function importJSON(text: string): number {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('Expected a JSON array of friends.');
  const cleaned: Friend[] = data.map((d: Partial<Friend>) => ({
    id: typeof d.id === 'string' ? d.id : uid(),
    name: String(d.name ?? 'Unknown'),
    level: (Math.min(7, Math.max(1, Number(d.level) || 4)) as FriendLevel),
    tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
    metAt: String(d.metAt ?? ''),
    city: String(d.city ?? ''),
    country: String(d.country ?? ''),
    metDate: String(d.metDate ?? ''),
    lastContact: String(d.lastContact ?? ''),
    notes: String(d.notes ?? ''),
    favorite: Boolean(d.favorite),
    createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
  }));
  friends.set(cleaned);
  return cleaned.length;
}

// ── Theme ────────────────────────────────────────────────────────────────────
function loadTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  return 'light';
}

export const theme = writable<Theme>(loadTheme());

theme.subscribe((t) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', t === 'dark');
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* ignore */
  }
});

export function toggleTheme(): void {
  theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
}
