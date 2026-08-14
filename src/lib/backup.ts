import { get } from 'svelte/store';
import { friends, importJSON } from './store';
import { family, sanitizeFamily, setFamily } from './familyStore';

/**
 * One file holds both sections. Lives apart from the two stores so neither has
 * to import the other.
 */
export interface Backup {
  version: 2;
  friends: unknown[];
  family: unknown[];
}

export function exportAll(): string {
  const payload: Backup = {
    version: 2,
    friends: get(friends),
    family: get(family),
  };
  return JSON.stringify(payload, null, 2);
}

export interface ImportResult {
  friends: number;
  family: number;
}

/** Accepts the current bundle, or a bare array from the friends-only versions. */
export function importAll(text: string): ImportResult {
  const data = JSON.parse(text);

  if (Array.isArray(data)) {
    return { friends: importJSON(text), family: 0 };
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Unrecognised file — expected a My Circle export.');
  }

  const result: ImportResult = { friends: 0, family: 0 };
  if (Array.isArray(data.friends)) {
    result.friends = importJSON(JSON.stringify(data.friends));
  }
  if (Array.isArray(data.family)) {
    const members = sanitizeFamily(data.family);
    setFamily(members);
    result.family = members.length;
  }
  if (!Array.isArray(data.friends) && !Array.isArray(data.family)) {
    throw new Error('No "friends" or "family" list found in the file.');
  }
  return result;
}
