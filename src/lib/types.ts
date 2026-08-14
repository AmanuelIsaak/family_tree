/** Friendship closeness, 1 = closest (inner circle) … 7 = most distant. */
export type FriendLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Friend {
  id: string;
  name: string;
  level: FriendLevel;
  /** Free-form tags, e.g. "college", "work", "neighbour". */
  tags: string[];
  /** Where / how you met them. */
  metAt: string;
  /** City they live in now (optional). */
  city?: string;
  /** Country they live in now (optional). */
  country?: string;
  /** ISO date (YYYY-MM-DD) you met — drives the timeline view. */
  metDate: string;
  /** ISO date of last meaningful contact. */
  lastContact: string;
  notes: string;
  favorite: boolean;
  /** ISO timestamp the record was created. */
  createdAt: string;
}

export type View = 'circles' | 'timeline' | 'grid' | 'eras';

export type Theme = 'light' | 'dark';

// ── Family ───────────────────────────────────────────────────────────────────

/** The two-sided split: your mother's line, your own line, your father's line. */
export type FamilySide = 'maternal' | 'own' | 'paternal';

export type FamilyRoleId =
  | 'self'
  | 'spouse'
  | 'sibling'
  | 'sibling-in-law'
  | 'cousin'
  | 'cousin-in-law'
  | 'second-cousin'
  | 'parents-cousin'
  | 'mother'
  | 'father'
  | 'stepparent'
  | 'aunt'
  | 'uncle'
  | 'aunt-in-law'
  | 'uncle-in-law'
  | 'parent-in-law'
  | 'grandmother'
  | 'grandfather'
  | 'great-aunt-uncle'
  | 'great-grandparent'
  | 'great-great-grandparent'
  | 'child'
  | 'child-in-law'
  | 'nibling'
  | 'grandchild'
  | 'other';

export interface FamilyMember {
  id: string;
  name: string;
  role: FamilyRoleId;
  /** Which line of the family they belong to. Drives left / centre / right. */
  side: FamilySide;
  /**
   * Optional nesting: a cousin under a specific aunt/uncle, a niece under a
   * specific sibling. Purely additive — the tree still lays out without it.
   */
  parentId?: string;
  /**
   * The blood relative this person married into the family through — your
   * aunt's husband points at your aunt. Setting it parks them beside their
   * partner and, crucially, stops them being drawn as a child of the
   * generation above, which they are not.
   */
  partnerId?: string;
  /** Generation override, only meaningful for the open-ended `other` role. */
  generation?: number;
  /** ISO date (YYYY-MM-DD). */
  birthDate?: string;
  deceased: boolean;
  /** Year of death, kept loose so "1998" alone is fine. */
  deceasedYear?: string;
  city?: string;
  country?: string;
  notes: string;
  favorite: boolean;
  createdAt: string;
}

/** Top-level section of the app. */
export type Section = 'friends' | 'family';

/** How the family is drawn: the full tree, or the ancestor-only bracket. */
export type FamilyView = 'tree' | 'bracket';
