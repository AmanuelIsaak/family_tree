import { writable, derived, get } from 'svelte/store';
import type { FamilyMember, FamilyRoleId, FamilySide, FamilyView, Section } from './types';
import { SAMPLE_FAMILY } from './familySampleData';
import { generationOf, isDistantRole, isInLawRole, roleMeta } from './familyRoles';
import { search } from './store';

const FAMILY_KEY = 'mycircle:family';

/** There is always exactly one `self` — the person in the middle of the tree. */
function ensureSelf(list: FamilyMember[]): FamilyMember[] {
  const selves = list.filter((m) => m.role === 'self');
  if (selves.length === 1) return list;
  if (selves.length === 0) {
    return [
      {
        id: 'f-self',
        name: 'You',
        role: 'self',
        side: 'own',
        deceased: false,
        notes: '',
        favorite: false,
        createdAt: new Date().toISOString(),
      },
      ...list,
    ];
  }
  // Keep the first, demote the rest so the layout stays well defined.
  let seen = false;
  return list.map((m) => {
    if (m.role !== 'self') return m;
    if (!seen) {
      seen = true;
      return m;
    }
    return { ...m, role: 'other' as FamilyRoleId, side: 'own' as FamilySide };
  });
}

function loadFamily(): FamilyMember[] {
  try {
    const raw = localStorage.getItem(FAMILY_KEY);
    if (raw) return ensureSelf(JSON.parse(raw) as FamilyMember[]);
  } catch {
    /* ignore corrupt storage */
  }
  return SAMPLE_FAMILY;
}

export const family = writable<FamilyMember[]>(loadFamily());

family.subscribe((list) => {
  try {
    localStorage.setItem(FAMILY_KEY, JSON.stringify(list));
  } catch {
    /* storage may be unavailable */
  }
});

// ── UI state ────────────────────────────────────────────────────────────────
export const section = writable<Section>('friends');
export const familyView = writable<FamilyView>('tree');
/** Sides currently shown. Empty = all. `self` is always visible regardless. */
export const sideFilter = writable<Set<FamilySide>>(new Set());
/**
 * Whether the extended branches — great-aunts/uncles and everyone below them —
 * are drawn. Folding them away is the quickest way to get a big family back to
 * a readable width.
 */
export const showDistant = writable(true);

export const visibleFamily = derived(
  [family, sideFilter, showDistant],
  ([$family, $sideFilter, $showDistant]) =>
    $family.filter((m) => {
      if (m.role === 'self') return true;
      if (!$showDistant && isDistantRole(m.role)) return false;
      return $sideFilter.size === 0 || $sideFilter.has(m.side);
    }),
);

/** How many relatives the "distant kin" toggle controls. */
export const distantCount = derived(family, ($family) =>
  $family.filter((m) => isDistantRole(m.role)).length,
);

/**
 * Search *highlights* in the family tree rather than filtering — pulling nodes
 * out of a pedigree would break the very structure you're reading it for.
 */
export const familyMatches = derived([visibleFamily, search], ([$members, $search]) => {
  const q = $search.trim().toLowerCase();
  if (!q) return null; // null = "no search active", everything at full strength
  const ids = new Set<string>();
  for (const m of $members) {
    const hay = [m.name, m.city ?? '', m.country ?? '', m.notes, roleMeta(m.role).label]
      .join(' ')
      .toLowerCase();
    if (hay.includes(q)) ids.add(m.id);
  }
  return ids;
});

// ── Mutations ────────────────────────────────────────────────────────────────
function uid(): string {
  return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export type FamilyDraft = Omit<FamilyMember, 'id' | 'createdAt'>;

export function addMember(draft: FamilyDraft): FamilyMember {
  const member: FamilyMember = { ...draft, id: uid(), createdAt: new Date().toISOString() };
  family.update((list) => [...list, member]);
  return member;
}

export function updateMember(id: string, patch: Partial<FamilyDraft>): void {
  family.update((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));
}

export function removeMember(id: string): void {
  family.update((list) =>
    // Orphan any nested relatives rather than deleting them with their parent,
    // and unpartner a surviving spouse instead of leaving a dangling link.
    list
      .filter((m) => m.id !== id)
      .map((m) => {
        if (m.parentId !== id && m.partnerId !== id) return m;
        return {
          ...m,
          parentId: m.parentId === id ? undefined : m.parentId,
          partnerId: m.partnerId === id ? undefined : m.partnerId,
        };
      }),
  );
}

export function toggleMemberFavorite(id: string): void {
  family.update((list) => list.map((m) => (m.id === id ? { ...m, favorite: !m.favorite } : m)));
}

/**
 * Which relations can actually be the parent of which. A cousin hangs off an
 * aunt or uncle — never off your own mother, whose children are your siblings.
 * Roles absent here (`other`) accept anyone a generation up.
 */
const PARENT_ROLES: Partial<Record<FamilyRoleId, FamilyRoleId[]>> = {
  // Either half of the couple works — the tree hangs them off the pair's middle.
  cousin: ['aunt', 'uncle', 'aunt-in-law', 'uncle-in-law', 'stepparent'],
  nibling: ['sibling', 'sibling-in-law'],
  grandchild: ['child', 'child-in-law'],
  // The extended branch, one link per generation:
  // great-grandparent → great-aunt/uncle → parent's cousin → second cousin.
  'great-aunt-uncle': ['great-grandparent'],
  'parents-cousin': ['great-aunt-uncle'],
  'second-cousin': ['parents-cousin'],
  // The direct ancestor line, which seats the bracket.
  grandmother: ['great-grandparent'],
  grandfather: ['great-grandparent'],
  'great-grandparent': ['great-great-grandparent'],
};

/**
 * Who each in-law relation is an in-law *through*. An aunt-in-law married your
 * aunt or uncle; she did not marry your mother. Roles absent here (a blood
 * relative being paired off, e.g. linking your mother and father so their
 * marriage bar is drawn) accept any blood relative of the same generation.
 */
const PARTNER_ROLES: Partial<Record<FamilyRoleId, FamilyRoleId[]>> = {
  'aunt-in-law': ['aunt', 'uncle'],
  'uncle-in-law': ['aunt', 'uncle'],
  'cousin-in-law': ['cousin', 'second-cousin'],
  'sibling-in-law': ['sibling'],
  'child-in-law': ['child'],
};

/**
 * Blood relatives someone could have married. Same generation, already in the
 * family by birth (so two married-in people can't be paired to each other), and
 * not already spoken for.
 */
export function partnerCandidates(role: FamilyRoleId, generation: number, excludeId?: string) {
  const list = get(family);
  const taken = new Set(
    list.flatMap((m) => (m.partnerId && m.id !== excludeId ? [m.partnerId, m.id] : [])),
  );
  const allowed = PARTNER_ROLES[role];
  return list.filter(
    (m) =>
      m.id !== excludeId &&
      m.role !== 'self' &&
      !isInLawRole(m.role) &&
      !m.partnerId &&
      !taken.has(m.id) &&
      (!allowed || allowed.includes(m.role)) &&
      generationOf(m) === generation,
  );
}

/** Relatives that could plausibly be the parent of a `role` in `generation`. */
export function parentCandidates(
  role: FamilyRoleId,
  generation: number,
  side: FamilySide,
  excludeId?: string,
) {
  const allowed = PARENT_ROLES[role];
  return get(family).filter(
    (m) =>
      m.id !== excludeId &&
      m.role !== 'self' &&
      generationOf(m) === generation + 1 &&
      (!allowed || allowed.includes(m.role)) &&
      (m.side === side || side === 'own' || m.side === 'own'),
  );
}

// ── Import / export ──────────────────────────────────────────────────────────
export function sanitizeFamily(data: unknown): FamilyMember[] {
  if (!Array.isArray(data)) throw new Error('Expected a JSON array of family members.');
  const cleaned: FamilyMember[] = data.map((d: Partial<FamilyMember>) => {
    const role = (typeof d.role === 'string' ? d.role : 'other') as FamilyRoleId;
    const meta = roleMeta(role);
    const side = (typeof d.side === 'string' ? d.side : meta.sides[0]) as FamilySide;
    return {
      id: typeof d.id === 'string' ? d.id : uid(),
      name: String(d.name ?? 'Unknown'),
      role,
      side: meta.sides.includes(side) ? side : meta.sides[0],
      parentId: typeof d.parentId === 'string' ? d.parentId : undefined,
      partnerId: typeof d.partnerId === 'string' ? d.partnerId : undefined,
      generation: typeof d.generation === 'number' ? d.generation : undefined,
      birthDate: typeof d.birthDate === 'string' ? d.birthDate : undefined,
      deceased: Boolean(d.deceased),
      deceasedYear: typeof d.deceasedYear === 'string' ? d.deceasedYear : undefined,
      city: String(d.city ?? ''),
      country: String(d.country ?? ''),
      notes: String(d.notes ?? ''),
      favorite: Boolean(d.favorite),
      createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
    };
  });
  // Drop parent and partner links pointing at people who didn't come along.
  const ids = new Set(cleaned.map((m) => m.id));
  return ensureSelf(
    cleaned.map((m) => ({
      ...m,
      parentId: m.parentId && ids.has(m.parentId) ? m.parentId : undefined,
      partnerId: m.partnerId && ids.has(m.partnerId) && m.partnerId !== m.id ? m.partnerId : undefined,
    })),
  );
}

export function setFamily(list: FamilyMember[]): void {
  family.set(ensureSelf(list));
}
