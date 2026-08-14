import type { FamilyMember, FamilyRoleId, FamilySide } from './types';

export interface RoleMeta {
  id: FamilyRoleId;
  label: string;
  /** Generation relative to you: +1 = your parents, -1 = your children. */
  generation: number;
  /** Position within the generation row; lower sits closer to the centre. */
  rank: number;
  /** Which sides this role may be assigned to. A single entry means it's forced. */
  sides: FamilySide[];
  /** Within your own centre column, does this role sit left or right of you? */
  axis?: 'left' | 'right';
  /** May be nested under a specific relative one generation up. */
  nestable?: boolean;
  /**
   * This relation exists only through marriage — an aunt's husband, a
   * sibling's partner. They are never drawn as a child of the generation
   * above, and never offered as someone else's spouse.
   */
  marriedIn?: boolean;
  /**
   * Kin out past the grandparents' siblings: great-aunts and great-uncles and
   * everyone descending from them. They can be folded away as a group, since
   * they are what makes a big family too wide to read at a glance.
   */
  distant?: boolean;
}

/**
 * Every role the tree understands, grouped by generation. `generation` and
 * `side` together decide where a person lands: generation picks the row,
 * side picks maternal (left) / own (centre) / paternal (right).
 */
export const FAMILY_ROLES: RoleMeta[] = [
  // ── Two generations up ─────────────────────────────────────────────────────
  { id: 'great-great-grandparent', label: 'Great-great-grandparent', generation: 4, rank: 0, sides: ['maternal', 'paternal'] },
  { id: 'great-grandparent', label: 'Great-grandparent', generation: 3, rank: 0, sides: ['maternal', 'paternal'], nestable: true },
  { id: 'grandmother', label: 'Grandmother', generation: 2, rank: 0, sides: ['maternal', 'paternal'], nestable: true },
  { id: 'grandfather', label: 'Grandfather', generation: 2, rank: 1, sides: ['maternal', 'paternal'], nestable: true },
  // Your grandparent's sibling, and the branch that descends from them.
  { id: 'great-aunt-uncle', label: 'Great-aunt / uncle', generation: 2, rank: 3, sides: ['maternal', 'paternal'], nestable: true, distant: true },

  // ── Parents' generation ────────────────────────────────────────────────────
  { id: 'mother', label: 'Mother', generation: 1, rank: 0, sides: ['maternal'] },
  { id: 'father', label: 'Father', generation: 1, rank: 0, sides: ['paternal'] },
  { id: 'stepparent', label: 'Step-parent', generation: 1, rank: 1, sides: ['maternal', 'paternal'] },
  { id: 'aunt', label: 'Aunt', generation: 1, rank: 2, sides: ['maternal', 'paternal'] },
  { id: 'uncle', label: 'Uncle', generation: 1, rank: 2, sides: ['maternal', 'paternal'] },
  // Married to your aunt or uncle — kin by marriage, not by blood.
  { id: 'aunt-in-law', label: 'Aunt-in-law', generation: 1, rank: 3, sides: ['maternal', 'paternal'], marriedIn: true },
  { id: 'uncle-in-law', label: 'Uncle-in-law', generation: 1, rank: 3, sides: ['maternal', 'paternal'], marriedIn: true },
  { id: 'parent-in-law', label: 'Parent-in-law', generation: 1, rank: 4, sides: ['own'], marriedIn: true },
  // A great-aunt/uncle's child: your parent's cousin.
  { id: 'parents-cousin', label: "Parent's cousin", generation: 1, rank: 5, sides: ['maternal', 'paternal'], nestable: true, distant: true },

  // ── Your generation ────────────────────────────────────────────────────────
  { id: 'self', label: 'You', generation: 0, rank: 0, sides: ['own'] },
  { id: 'sibling', label: 'Sibling', generation: 0, rank: 1, sides: ['own'], axis: 'left' },
  { id: 'spouse', label: 'Partner / spouse', generation: 0, rank: 1, sides: ['own'], axis: 'right', marriedIn: true },
  { id: 'sibling-in-law', label: 'Sibling-in-law', generation: 0, rank: 2, sides: ['own'], axis: 'right', marriedIn: true },
  { id: 'cousin', label: 'Cousin', generation: 0, rank: 5, sides: ['maternal', 'paternal'], nestable: true },
  { id: 'cousin-in-law', label: 'Cousin-in-law', generation: 0, rank: 6, sides: ['maternal', 'paternal'], marriedIn: true },
  // Your parent's cousin's child.
  { id: 'second-cousin', label: 'Second cousin', generation: 0, rank: 7, sides: ['maternal', 'paternal'], nestable: true, distant: true },

  // ── Below you ──────────────────────────────────────────────────────────────
  { id: 'child', label: 'Child', generation: -1, rank: 0, sides: ['own'] },
  { id: 'child-in-law', label: 'Child-in-law', generation: -1, rank: 1, sides: ['own'], axis: 'right', marriedIn: true },
  { id: 'nibling', label: 'Niece / nephew', generation: -1, rank: 3, sides: ['own', 'maternal', 'paternal'], nestable: true },
  { id: 'grandchild', label: 'Grandchild', generation: -2, rank: 0, sides: ['own'], nestable: true },

  // ── Escape hatch ───────────────────────────────────────────────────────────
  { id: 'other', label: 'Other relative', generation: 0, rank: 8, sides: ['maternal', 'own', 'paternal'], nestable: true },
];

const byId = new Map<FamilyRoleId, RoleMeta>(FAMILY_ROLES.map((r) => [r.id, r]));

export function roleMeta(role: FamilyRoleId): RoleMeta {
  return byId.get(role) ?? byId.get('other')!;
}

export function roleLabel(role: FamilyRoleId): string {
  return roleMeta(role).label;
}

/** True for relations that exist only through marriage. */
export function isInLawRole(role: FamilyRoleId): boolean {
  return roleMeta(role).marriedIn === true;
}

/** True for the extended branches that can be folded away as a group. */
export function isDistantRole(role: FamilyRoleId): boolean {
  return roleMeta(role).distant === true;
}

/** Row a member occupies. `other` may override it; everyone else is fixed. */
export function generationOf(m: Pick<FamilyMember, 'role' | 'generation'>): number {
  const meta = roleMeta(m.role);
  if (m.role === 'other' && typeof m.generation === 'number') return m.generation;
  return meta.generation;
}

/** Colour band per generation — the tree reads top-to-bottom by hue. */
const GENERATION_HEX: Record<number, string> = {
  4: '#5b21b6',
  3: '#7c3aed',
  2: '#6366f1',
  1: '#f97316',
  0: '#ef4444',
  [-1]: '#06b6d4',
  [-2]: '#0ea5e9',
};

export function generationHex(generation: number): string {
  return GENERATION_HEX[generation] ?? '#64748b';
}

export const GENERATION_LABELS: { generation: number; label: string }[] = [
  { generation: 4, label: 'Great-great-grandparents' },
  { generation: 3, label: 'Great-grandparents' },
  { generation: 2, label: 'Grandparents' },
  { generation: 1, label: 'Parents' },
  { generation: 0, label: 'Your generation' },
  { generation: -1, label: 'Children' },
  { generation: -2, label: 'Grandchildren' },
];

export const SIDE_LABELS: Record<FamilySide, string> = {
  maternal: "Mother's side",
  own: 'My line',
  paternal: "Father's side",
};

/** Roles offered in the picker, ordered oldest generation first. `self` is implicit. */
export const SELECTABLE_ROLES: RoleMeta[] = FAMILY_ROLES.filter((r) => r.id !== 'self');
