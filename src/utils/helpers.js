import { cMap } from '../data/countries.js';
import { state } from './storage.js';

export const $ = (id) => document.getElementById(id);

export const gm = (id) => state.members.find(m => m.id === id);

export const pk = (pid) => state.members.filter(m => m.parent1Id === pid);

export function gen(id, visited) {
  if (!visited) visited = new Set();
  if (visited.has(id)) return 0;
  visited.add(id);
  const m = gm(id);
  return (!m || !m.parent1Id) ? 0 : 1 + gen(m.parent1Id, visited);
}

export function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function getSide(m) {
  if (m.side && m.side !== '') return m.side;
  if (m.parent1Id) {
    const p = gm(m.parent1Id);
    if (p) return getSide(p);
  }
  return '';
}

export function subLbl(m) {
  const p = [];
  if (m.birthYear) p.push('b.' + m.birthYear);
  if (m.country && cMap[m.country]) p.push(cMap[m.country].flag + (m.city ? ' ' + m.city : ''));
  const k = pk(m.id);
  if (k.length) p.push(k.length + 'ch');
  if (m.spouseId) {
    const sp = gm(m.spouseId);
    if (sp) p.push('∞' + sp.firstName);
  }
  if (m.notes) p.push(m.notes);
  return p.join(' · ') || 'No details';
}

export function getSiblings(personId) {
  const m = gm(personId);
  if (!m) return [];
  const sibs = new Set();
  if (m.parent1Id) {
    state.members.forEach(s => {
      if (s.id !== personId && s.parent1Id === m.parent1Id) sibs.add(s);
    });
  }
  if (m.parent2Id) {
    state.members.forEach(s => {
      if (s.id !== personId && (s.parent1Id === m.parent2Id || s.parent2Id === m.parent2Id)) sibs.add(s);
    });
  }
  return [...sibs].sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999) || a.id - b.id);
}

export function buildAncestorChain(personId) {
  const chain = [];
  let cur = gm(personId);
  while (cur && cur.parent1Id) {
    const p = gm(cur.parent1Id);
    if (!p) break;
    chain.push({ id: p.id, spouseId: p.spouseId || null });
    cur = p;
  }
  return chain;
}

export function desc(id, visited) {
  if (!visited) visited = new Set();
  if (visited.has(id)) return 0;
  visited.add(id);
  let c = 0;
  pk(id).forEach(k => { c++; c += desc(k.id, visited); });
  const m = gm(id);
  if (m && m.spouseId && !visited.has(m.spouseId)) {
    pk(m.spouseId).forEach(k => {
      if (!visited.has(k.id)) { c++; c += desc(k.id, visited); }
    });
  }
  return c;
}
