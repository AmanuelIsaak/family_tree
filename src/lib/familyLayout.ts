import type { FamilyMember, FamilySide } from './types';
import { generationOf, isDistantRole, isInLawRole, roleMeta } from './familyRoles';

// ── Geometry ─────────────────────────────────────────────────────────────────
export const NODE_W = 118;
export const NODE_H = 58;
const COL_GAP = 16;
const ROW_GAP = 128;
const STEP = NODE_W + COL_GAP;
/**
 * Extra breathing room inserted where a side's direct family ends and its
 * extended branch begins, so your grandfather's brother doesn't read as another
 * grandparent and your parent's cousin doesn't read as another aunt.
 */
const BRANCH_GAP = 46;

export interface PlacedNode {
  member: FamilyMember;
  generation: number;
  /** Centre of the card. */
  x: number;
  y: number;
}

export interface FamilyLayout {
  nodes: PlacedNode[];
  /** SVG paths joining parents to children. */
  connectors: string[];
  /** Descent lines inside the extended branch, drawn dashed to match its cards. */
  distantConnectors: string[];
  /** Short bars joining a couple, drawn differently from descent lines. */
  couples: string[];
  /** x positions where a side's direct family gives way to its extended branch. */
  branchDividers: number[];
  /** Rows that actually contain someone, oldest first. */
  rows: { generation: number; y: number }[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const EMPTY: FamilyLayout = {
  nodes: [],
  connectors: [],
  distantConnectors: [],
  couples: [],
  branchDividers: [],
  rows: [],
  minX: 0,
  maxX: 0,
  minY: 0,
  maxY: 0,
};

/**
 * A blood relative together with whoever married in beside them. The anchor is
 * always the one who belongs to the bloodline, so it stays nearest the centre
 * and keeps the descent lines short.
 */
type Unit = FamilyMember[];

/**
 * Groups a row's members into couples. Anyone carrying a `partnerId` is folded
 * in beside their partner and gives up their own slot in the ordering.
 */
function toUnits(list: FamilyMember[], order: (a: FamilyMember, b: FamilyMember) => number): Unit[] {
  const byId = new Map(list.map((m) => [m.id, m]));
  const used = new Set<string>();
  const units: Unit[] = [];

  for (const m of [...list].sort(order)) {
    if (used.has(m.id)) continue;
    const stated = m.partnerId ? byId.get(m.partnerId) : undefined;
    // Or someone in this row may point at *them*.
    const pointing = list.find((o) => o.partnerId === m.id && !used.has(o.id) && o.id !== m.id);
    const partner = stated && !used.has(stated.id) && stated.id !== m.id ? stated : pointing;

    used.add(m.id);
    if (partner) {
      used.add(partner.id);
      // The blood relative anchors the pair and keeps the inner slot, so the
      // in-law sits on the outside and descent lines stay short.
      const mIn = isInLawRole(m.role) || Boolean(m.partnerId);
      const pIn = isInLawRole(partner.role) || Boolean(partner.partnerId);
      const anchor = mIn && !pIn ? partner : m;
      units.push([anchor, anchor === m ? partner : m]);
    } else {
      units.push([m]);
    }
  }
  return units;
}

/**
 * True when this person joined the family by marriage rather than by birth —
 * either because their relation says so (Uncle-in-law) or because they are
 * linked as someone's spouse. Role alone is enough, so an in-law is still kept
 * out of the descent lines when no partner has been picked yet.
 */
function marriedIn(m: FamilyMember, byId: Map<string, FamilyMember>): boolean {
  return isInLawRole(m.role) || Boolean(m.partnerId && byId.has(m.partnerId));
}

function rowY(generation: number): number {
  return -generation * ROW_GAP;
}

/**
 * Lays the family out as a two-sided pedigree.
 *
 * Rows are generations (grandparents at the top, grandchildren at the bottom);
 * columns fan out from a centre axis with the mother's side to the left and the
 * father's side to the right. `you` is pinned to x = 0 so the whole figure reads
 * as one person with their family spreading out around them.
 *
 * Generations are placed oldest-first so that when a child carries an explicit
 * `parentId` we already know where the parent landed and can order the children
 * to match — that keeps the connector lines from crossing.
 */
export function layoutFamily(members: FamilyMember[]): FamilyLayout {
  if (members.length === 0) return EMPTY;

  const rowsMap = new Map<number, FamilyMember[]>();
  for (const m of members) {
    const g = generationOf(m);
    const bucket = rowsMap.get(g);
    if (bucket) bucket.push(m);
    else rowsMap.set(g, [m]);
  }

  const placed = new Map<string, PlacedNode>();
  const generations = [...rowsMap.keys()].sort((a, b) => b - a); // oldest first

  // Partnerships resolved both ways, so either half can find the other.
  const partnerLookup = new Map<string, string>();
  const memberIds = new Set(members.map((m) => m.id));
  for (const m of members) {
    if (!m.partnerId || m.partnerId === m.id || !memberIds.has(m.partnerId)) continue;
    partnerLookup.set(m.id, m.partnerId);
    partnerLookup.set(m.partnerId, m.id);
  }

  /**
   * Who belongs to the extended branch for layout purposes: anyone with a
   * distant relation, plus whoever married one of them, so a couple is never
   * split across the divide.
   */
  const memberById = new Map(members.map((m) => [m.id, m]));
  const farIds = new Set<string>();
  for (const m of members) {
    if (isDistantRole(m.role)) farIds.add(m.id);
    else {
      const mate = partnerLookup.get(m.id);
      if (mate && isDistantRole(memberById.get(mate)?.role ?? 'other')) farIds.add(m.id);
    }
  }
  const isFar = (m: FamilyMember) => farIds.has(m.id);

  const placeRow = (g: number, phase: 'direct' | 'extended') => {
    const row = rowsMap.get(g)!.filter((m) => (phase === 'extended') === isFar(m));
    if (row.length === 0) return;
    const y = rowY(g);

    // How far from the centre a member's parent ended up. Members whose parent
    // is unknown sort to the outside of the row.
    const outwardness = (m: FamilyMember): number => {
      if (!m.parentId) return Number.MAX_SAFE_INTEGER;
      const p = placed.get(m.parentId);
      return p ? Math.abs(p.x) : Number.MAX_SAFE_INTEGER;
    };

    const order = (a: FamilyMember, b: FamilyMember): number => {
      const ra = roleMeta(a.role).rank;
      const rb = roleMeta(b.role).rank;
      if (ra !== rb) return ra - rb;
      const oa = outwardness(a);
      const ob = outwardness(b);
      if (oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name);
    };

    // Couples occupy two adjacent slots and are ordered by their blood anchor.
    const unitsOn = (side: FamilySide) => toUnits(row.filter((m) => m.side === side), order);
    const ownUnits = unitsOn('own');
    const maternalUnits = unitsOn('maternal');
    const paternalUnits = unitsOn('paternal');
    const flat = (units: Unit[]) => units.flat();
    const own = flat(ownUnits);

    const put = (m: FamilyMember, x: number) => {
      placed.set(m.id, { member: m, generation: g, x, y });
    };

    // ── Centre column ────────────────────────────────────────────────────────
    let ownMin = 0;
    let ownMax = 0;
    const selfUnit = ownUnits.find((u) => u.some((m) => m.role === 'self'));

    if (selfUnit) {
      // Pin you to the axis; siblings grow left, your partner and in-laws right.
      const self = selfUnit.find((m) => m.role === 'self')!;
      put(self, 0);
      const rest = ownUnits.filter((u) => u !== selfUnit);
      // Your own partner shares your unit but belongs on your right.
      const spouse = selfUnit.find((m) => m !== self);
      const left = flat(rest.filter((u) => roleMeta(u[0].role).axis === 'left'));
      const right = flat(rest.filter((u) => roleMeta(u[0].role).axis !== 'left'));
      if (spouse) right.unshift(spouse);
      left.forEach((m, i) => put(m, -(i + 1) * STEP));
      right.forEach((m, i) => put(m, (i + 1) * STEP));
      ownMin = -left.length * STEP;
      ownMax = right.length * STEP;
    } else if (own.length > 0) {
      const start = -((own.length - 1) / 2) * STEP;
      own.forEach((m, i) => put(m, start + i * STEP));
      ownMin = start;
      ownMax = start + (own.length - 1) * STEP;
    }

    // With no centre column (grandparents, parents) the two sides straddle the
    // axis directly — mother immediately left of it, father immediately right.
    const leftAnchor = own.length > 0 ? ownMin - STEP : -STEP / 2;
    const rightAnchor = own.length > 0 ? ownMax + STEP : STEP / 2;

    const placeSide = (units: Unit[], anchor: number, dir: -1 | 1) =>
      flat(units).forEach((person, i) => put(person, anchor + dir * i * STEP));

    if (phase === 'direct') {
      placeSide(maternalUnits, leftAnchor, -1);
      placeSide(paternalUnits, rightAnchor, 1);
    } else {
      // The extended branch starts beyond every direct relative on its half, so
      // it can never share an x with one — which is what made a great-uncle sit
      // exactly above an uncle and read as his father.
      placeSide(maternalUnits, branchStart.maternal, -1);
      placeSide(paternalUnits, branchStart.paternal, 1);
    }
  };

  // Pass 1: the direct family, which fixes how wide each half really is.
  for (const g of generations) placeRow(g, 'direct');

  const directXs = [...placed.values()].map((n) => n.x);
  const leftMostDirect = Math.min(0, ...directXs);
  const rightMostDirect = Math.max(0, ...directXs);
  const OFFSET = STEP + BRANCH_GAP;
  const branchStart = {
    maternal: leftMostDirect - OFFSET,
    paternal: rightMostDirect + OFFSET,
  };

  // Pass 2: the extended branch, hung off that boundary on both sides.
  for (const g of generations) placeRow(g, 'extended');

  // Pass 3: nudge nested children under their parent, oldest row first so each
  // row sees final positions above it.
  for (const g of generations) {
    alignChildrenUnderParents(
      rowsMap.get(g)!.map((m) => placed.get(m.id)!),
      placed,
      partnerLookup,
      farIds,
    );
  }

  const nodes = [...placed.values()];
  const { connectors, distantConnectors, couples } = buildConnectors(members, placed);

  // One divider per side, sitting in the gap between the boundary and the
  // outermost direct relative.
  const branchDividers: number[] = [];
  for (const side of ['maternal', 'paternal'] as const) {
    if (!nodes.some((n) => isFar(n.member) && n.member.side === side)) continue;
    branchDividers.push(
      side === 'maternal' ? leftMostDirect - OFFSET / 2 : rightMostDirect + OFFSET / 2,
    );
  }

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const usedRows = generations
    .filter((g) => (rowsMap.get(g)?.length ?? 0) > 0)
    .map((g) => ({ generation: g, y: rowY(g) }));

  return {
    nodes,
    connectors,
    distantConnectors,
    couples,
    branchDividers,
    rows: usedRows,
    minX: Math.min(...xs) - NODE_W / 2,
    maxX: Math.max(...xs) + NODE_W / 2,
    minY: Math.min(...ys) - NODE_H / 2,
    maxY: Math.max(...ys) + NODE_H / 2,
  };
}

/**
 * Slides each run of siblings sideways so it sits under its shared parent,
 * clamped by whoever is already either side of it in the row. Purely cosmetic —
 * it never reorders anyone, so the "no crossing lines" guarantee from the sort
 * still holds, and a row with no room simply stays put.
 */
function alignChildrenUnderParents(
  row: PlacedNode[],
  placed: Map<string, PlacedNode>,
  partnerLookup: Map<string, string>,
  farIds: Set<string>,
): void {
  const sorted = [...row].sort((a, b) => a.x - b.x);
  let i = 0;

  /** Children hang below the middle of a couple, not below one of the pair. */
  const anchorX = (parent: PlacedNode): number => {
    const mate = partnerLookup.get(parent.member.id);
    const mateNode = mate ? placed.get(mate) : undefined;
    return mateNode && mateNode.generation === parent.generation
      ? (parent.x + mateNode.x) / 2
      : parent.x;
  };

  while (i < sorted.length) {
    const parentId = sorted[i].member.parentId;
    const parent = parentId ? placed.get(parentId) : undefined;
    // Only a genuine parent one row up is worth aligning to. And never drag a
    // relative from the extended branch back in towards a direct parent — that
    // would undo the separation the two-pass placement just established.
    const crossesBoundary = farIds.has(sorted[i].member.id) && !farIds.has(parent?.member.id ?? '');
    if (!parent || parent.generation <= sorted[i].generation || crossesBoundary) {
      i += 1;
      continue;
    }

    let end = i;
    while (end + 1 < sorted.length && sorted[end + 1].member.parentId === parentId) end += 1;

    const group = sorted.slice(i, end + 1);
    const first = group[0];
    const lastNode = group[group.length - 1];
    const centre = (first.x + lastNode.x) / 2;

    const prev = sorted[i - 1];
    const next = sorted[end + 1];
    const lo = prev ? prev.x + STEP - first.x : -Infinity;
    const hi = next ? next.x - STEP - lastNode.x : Infinity;

    if (lo <= hi) {
      const shift = Math.min(Math.max(anchorX(parent) - centre, lo), hi);
      for (const n of group) n.x += shift;
    }
    i = end + 1;
  }
}

/**
 * A standard pedigree bracket: a stem down from the parents, a horizontal bus
 * between the two rows, and a stub down into each child.
 */
function bracket(parents: PlacedNode[], children: PlacedNode[]): string | null {
  if (parents.length === 0 || children.length === 0) return null;

  const stemX = parents.reduce((sum, p) => sum + p.x, 0) / parents.length;
  const parentBottom = Math.max(...parents.map((p) => p.y)) + NODE_H / 2;
  const childTop = Math.min(...children.map((c) => c.y)) - NODE_H / 2;
  if (childTop <= parentBottom) return null; // same row or inverted — nothing sane to draw
  const busY = (parentBottom + childTop) / 2;

  const xs = children.map((c) => c.x);
  const left = Math.min(stemX, ...xs);
  const right = Math.max(stemX, ...xs);

  const parts = [`M ${stemX} ${parentBottom} V ${busY}`, `M ${left} ${busY} H ${right}`];
  for (const c of children) parts.push(`M ${c.x} ${busY} V ${childTop}`);
  return parts.join(' ');
}

function buildConnectors(
  members: FamilyMember[],
  placed: Map<string, PlacedNode>,
): { connectors: string[]; distantConnectors: string[]; couples: string[] } {
  const out: string[] = [];
  const distantOut: string[] = [];
  const couples: string[] = [];
  const nodes = [...placed.values()];
  const byId = new Map(members.map((m) => [m.id, m]));
  const at = (g: number) => nodes.filter((n) => n.generation === g);
  const push = (p: PlacedNode[], c: PlacedNode[]) => {
    const d = bracket(p, c);
    if (!d) return;
    // Descent within the extended branch is dashed, so a solid line always
    // means direct family and the two can't be mistaken for one another.
    const intoBranch = c.every((n) => isDistantRole(n.member.role));
    (intoBranch ? distantOut : out).push(d);
  };

  // ── Couples ────────────────────────────────────────────────────────────────
  // A bar between the two cards, and a note of who is partnered with whom so
  // descent lines can stem from the middle of a couple rather than one of them.
  const partnerOf = new Map<string, PlacedNode>();
  for (const m of members) {
    if (!m.partnerId) continue;
    const a = placed.get(m.id);
    const b = placed.get(m.partnerId);
    if (!a || !b || a.generation !== b.generation) continue;
    partnerOf.set(a.member.id, b);
    partnerOf.set(b.member.id, a);
    const left = Math.min(a.x, b.x) + NODE_W / 2;
    const right = Math.max(a.x, b.x) - NODE_W / 2;
    if (right > left) couples.push(`M ${left} ${a.y} H ${right}`);
  }

  /** The pair a descent line should hang from: a couple, or a lone parent. */
  const descentFrom = (n: PlacedNode): PlacedNode[] => {
    const p = partnerOf.get(n.member.id);
    return p ? [n, p] : [n];
  };

  // Explicit nesting wins: a cousin hung off a particular aunt, a niece off a
  // particular sibling. Those children are then excluded from the structural
  // links below so they aren't wired up twice.
  const nested = new Set<string>();
  const byParent = new Map<string, PlacedNode[]>();
  for (const m of members) {
    if (!m.parentId) continue;
    const parent = placed.get(m.parentId);
    const child = placed.get(m.id);
    if (!parent || !child) continue;
    nested.add(m.id);
    const group = byParent.get(m.parentId);
    if (group) group.push(child);
    else byParent.set(m.parentId, [child]);
  }
  for (const [parentId, children] of byParent) {
    push(descentFrom(placed.get(parentId)!), children);
  }

  /**
   * Eligible to be drawn as a child of the row above: not already nested under
   * a named parent, and not someone who married into the family here.
   */
  const free = (list: PlacedNode[]) =>
    list.filter((n) => !nested.has(n.member.id) && !marriedIn(n.member, byId));
  const roleIn = (list: PlacedNode[], roles: string[]) =>
    list.filter((n) => roles.includes(n.member.role));

  for (const side of ['maternal', 'paternal'] as const) {
    const onSide = (list: PlacedNode[]) => list.filter((n) => n.member.side === side);

    // great-grandparents → grandparents, plus the grandparents' siblings
    push(
      roleIn(onSide(at(3)), ['great-grandparent']),
      free(roleIn(onSide(at(2)), ['grandmother', 'grandfather', 'great-aunt-uncle'])),
    );

    // grandparents → that side's parent, plus their siblings (your aunts/uncles)
    push(
      roleIn(onSide(at(2)), ['grandmother', 'grandfather']),
      free(roleIn(onSide(at(1)), ['mother', 'father', 'aunt', 'uncle'])),
    );
  }

  // parents → you and your siblings
  push(roleIn(at(1), ['mother', 'father']), free(roleIn(at(0), ['self', 'sibling'])));

  // you (+ partner) → your children → your grandchildren
  push(roleIn(at(0), ['self', 'spouse']), free(roleIn(at(-1), ['child'])));
  push(roleIn(at(-1), ['child']), free(roleIn(at(-2), ['grandchild'])));

  return { connectors: out, distantConnectors: distantOut, couples };
}
