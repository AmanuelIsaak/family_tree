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
  /** ISO date (YYYY-MM-DD) you met — drives the timeline view. */
  metDate: string;
  /** ISO date of last meaningful contact. */
  lastContact: string;
  notes: string;
  favorite: boolean;
  /** ISO timestamp the record was created. */
  createdAt: string;
}

export type View = 'circles' | 'timeline' | 'grid';

export type Theme = 'light' | 'dark';
