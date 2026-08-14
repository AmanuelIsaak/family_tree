import type { FamilyMember, FamilyRoleId, FamilySide } from './types';

/**
 * Ancestor bracket — the knockout-tournament shape.
 *
 * A pedigree is a binary tree: two parents per person, doubling every
 * generation. That is exactly a knockout draw read backwards, so the same
 * layout works — great-grandparents seeded at the outer edge, converging inward
 * through grandparents and parents to you in the middle. Your mother's line
 * fills the left half, your father's the right.
 *
 * Only direct ancestors appear. Siblings, aunts, cousins and children have no
 * slot in a bracket by construction; they live in the tree view.
 */

export const CARD_W = 132;
export const CARD_H = 46;
const COL_GAP = 30;
const COL = CARD_W + COL_GAP;

/** How deep the draw can go: you plus four rounds of ancestors, 31 seats. */
export const MAX_ROUNDS = 4;

/** 0 = you, 1 = parent, 2 = grandparent, 3 = great-, 4 = great-great-. */
export type BracketDepth = 0 | 1 | 2 | 3 | 4;

export interface BracketSlot {
  /** Null when nobody has been recorded for this position yet. */
  member: FamilyMember | null;
  depth: BracketDepth;
  side: FamilySide;
  /** What belongs here, used to label blanks and preset the add form. */
  role: FamilyRoleId;
  x: number;
  y: number;
}

export interface BracketLayout {
  slots: BracketSlot[];
  /** Elbow paths joining each pair to the ancestor they produced. */
  links: string[];
  /** How many rounds are drawn: 0 (just you) up to 3. */
  rounds: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const DEPTH_ROLE: Record<number, FamilyRoleId[]> = {
  1: ['mother', 'father'],
  2: ['grandmother', 'grandfather'],
  3: ['great-grandparent'],
  4: ['great-great-grandparent'],
};

/** The seat label for a blank at each depth. */
const DEPTH_BLANK: Record<number, FamilyRoleId> = {
  1: 'mother',
  2: 'grandmother',
  3: 'great-grandparent',
  4: 'great-great-grandparent',
};

function columnX(depth: number, side: FamilySide): number {
  if (depth === 0) return 0;
  return side === 'maternal' ? -depth * COL : depth * COL;
}

/** Leaves get tighter as the draw deepens, so a full bracket stays on screen. */
function rowHeight(rounds: number): number {
  return rounds >= 4 ? 60 : rounds === 3 ? 78 : 92;
}

/** Vertical centre of entry `index` of `count` slots in a column. */
function slotY(index: number, count: number, rounds: number): number {
  const leaves = 2 ** Math.max(0, rounds - 1);
  const spacing = rowHeight(rounds) * (leaves / count);
  return (index - (count - 1) / 2) * spacing;
}

export function layoutBracket(members: FamilyMember[]): BracketLayout {
  const self = members.find((m) => m.role === 'self') ?? null;
  const byId = new Map(members.map((m) => [m.id, m]));
  const on = (side: FamilySide, roles: FamilyRoleId[]) =>
    members.filter((m) => m.side === side && roles.includes(m.role));

  // Draw one round beyond the deepest ancestor recorded, so there is always a
  // rank of empty seats inviting the next generation back. Never fewer than two
  // rounds — a bracket needs some shape to read as one.
  const has = (d: number) =>
    (['maternal', 'paternal'] as FamilySide[]).some((s) => on(s, DEPTH_ROLE[d]).length > 0);
  let deepest = 0;
  for (let d = 1; d <= MAX_ROUNDS; d += 1) if (has(d)) deepest = d;
  const rounds = Math.min(MAX_ROUNDS, Math.max(2, deepest + 1));

  const slots: BracketSlot[] = [
    { member: self, depth: 0, side: 'own', role: 'self', x: 0, y: 0 },
  ];

  for (const side of ['maternal', 'paternal'] as const) {
    // Round 1 is the single parent on this side; every later round seats the
    // parents of the round before it, two behind each seat.
    const parentRole: FamilyRoleId = side === 'maternal' ? 'mother' : 'father';
    let previous: (FamilyMember | null)[] = [on(side, [parentRole])[0] ?? null];
    slots.push({
      member: previous[0],
      depth: 1,
      side,
      role: parentRole,
      x: columnX(1, side),
      y: 0,
    });

    for (let depth = 2; depth <= rounds; depth += 1) {
      const roles = DEPTH_ROLE[depth];
      const pool = on(side, roles);
      // Grandparents read grandmother-then-grandfather when nothing links them.
      if (depth === 2) {
        pool.sort((a, b) => (a.role === 'grandmother' ? -1 : 0) - (b.role === 'grandmother' ? -1 : 0));
      }
      const seats: (FamilyMember | null)[] = Array(previous.length * 2).fill(null);
      const claimed = new Set<string>();

      // A child's `parentId` names one of their parents; that person's partner
      // is the other. Whoever is left just fills the remaining seats in order.
      previous.forEach((child, j) => {
        if (!child?.parentId) return;
        const a = byId.get(child.parentId);
        if (!a || !roles.includes(a.role) || claimed.has(a.id)) return;
        seats[j * 2] = a;
        claimed.add(a.id);
        const mate = a.partnerId ? byId.get(a.partnerId) : undefined;
        if (mate && roles.includes(mate.role) && !claimed.has(mate.id)) {
          seats[j * 2 + 1] = mate;
          claimed.add(mate.id);
        }
      });
      const spare = pool.filter((m) => !claimed.has(m.id));
      for (let k = 0; k < seats.length; k += 1) if (!seats[k]) seats[k] = spare.shift() ?? null;

      seats.forEach((m, k) => {
        slots.push({
          member: m,
          depth: depth as BracketDepth,
          side,
          role: depth === 2 && k % 2 === 1 ? 'grandfather' : DEPTH_BLANK[depth],
          x: columnX(depth, side),
          y: slotY(k, seats.length, rounds),
        });
      });
      previous = seats;
    }
  }

  return { slots, links: buildLinks(slots, rounds), rounds, ...bounds(slots) };
}

/**
 * The bracket's signature elbow: a stub inward from each of the pair, a
 * vertical bar joining them, then one line on to the ancestor they produced.
 */
function buildLinks(slots: BracketSlot[], rounds: number): string[] {
  const out: string[] = [];
  const at = (depth: number, side: FamilySide) =>
    slots.filter((s) => s.depth === depth && s.side === side).sort((a, b) => a.y - b.y);

  for (const side of ['maternal', 'paternal'] as const) {
    const dir = side === 'maternal' ? -1 : 1;
    /** Edge of a card facing the centre. */
    const inner = (s: BracketSlot) => s.x - dir * (CARD_W / 2);
    /** Edge of a card facing outward, where its children's line arrives. */
    const outer = (s: BracketSlot) => s.x + dir * (CARD_W / 2);

    for (let depth = rounds; depth >= 1; depth -= 1) {
      const pairs = at(depth, side);
      const targets = depth === 1 ? slots.filter((s) => s.depth === 0) : at(depth - 1, side);

      for (let j = 0; j < targets.length; j += 1) {
        const a = pairs[j * 2];
        const b = pairs[j * 2 + 1];
        const target = targets[j];
        if (!target) continue;

        // The parent row holds a single card per side, so it joins straight on.
        if (!b) {
          if (a) out.push(`M ${inner(a)} ${a.y} H ${outer(target)}`);
          continue;
        }
        const elbowX = (inner(a) + outer(target)) / 2;
        out.push(`M ${inner(a)} ${a.y} H ${elbowX}`);
        out.push(`M ${inner(b)} ${b.y} H ${elbowX}`);
        out.push(`M ${elbowX} ${a.y} V ${b.y}`);
        out.push(`M ${elbowX} ${target.y} H ${outer(target)}`);
      }
    }
  }
  return out;
}

function bounds(slots: BracketSlot[]) {
  const xs = slots.map((s) => s.x);
  const ys = slots.map((s) => s.y);
  return {
    minX: Math.min(...xs) - CARD_W / 2,
    maxX: Math.max(...xs) + CARD_W / 2,
    minY: Math.min(...ys) - CARD_H / 2,
    maxY: Math.max(...ys) + CARD_H / 2,
  };
}
