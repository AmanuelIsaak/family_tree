import type { FamilyMember } from './types';

const T = '2026-01-01T00:00:00.000Z';

/**
 * Seed family shown the first time the Family section is opened. Deliberately
 * lopsided — a big maternal side, a smaller paternal one — so the two-sided
 * layout is obvious at a glance.
 */
export const SAMPLE_FAMILY: FamilyMember[] = [
  { id: 'f-self', name: 'You', role: 'self', side: 'own', deceased: false, notes: '', favorite: false, createdAt: T },

  // Maternal line
  { id: 'f-mgm', name: 'Selam Bekele', role: 'grandmother', side: 'maternal', birthDate: '1938-04-02', deceased: true, deceasedYear: '2019', city: 'Addis Ababa', country: 'Ethiopia', notes: 'Told the best stories.', favorite: true, createdAt: T },
  { id: 'f-mgf', name: 'Girma Bekele', role: 'grandfather', side: 'maternal', birthDate: '1935-11-20', deceased: true, deceasedYear: '2011', city: 'Addis Ababa', country: 'Ethiopia', notes: '', favorite: false, createdAt: T },
  { id: 'f-mom', name: 'Almaz Bekele', role: 'mother', side: 'maternal', birthDate: '1966-07-14', deceased: false, city: 'Zürich', country: 'Switzerland', notes: 'Calls every Sunday.', favorite: true, createdAt: T },
  { id: 'f-aunt1', name: 'Tigist Bekele', role: 'aunt', side: 'maternal', birthDate: '1969-02-09', deceased: false, city: 'Addis Ababa', country: 'Ethiopia', notes: '', favorite: false, createdAt: T },
  { id: 'f-uncle1', name: 'Yonas Bekele', role: 'uncle', side: 'maternal', birthDate: '1972-05-30', deceased: false, city: 'Dubai', country: 'United Arab Emirates', notes: '', favorite: false, createdAt: T },
  // Married into the family through Tigist — not a child of the grandparents.
  { id: 'f-aunt1-h', name: 'Bereket Haile', role: 'uncle-in-law', side: 'maternal', partnerId: 'f-aunt1', birthDate: '1966-11-04', deceased: false, city: 'Addis Ababa', country: 'Ethiopia', notes: "Tigist's husband.", favorite: false, createdAt: T },
  { id: 'f-c1', name: 'Nadia Haile', role: 'cousin', side: 'maternal', parentId: 'f-aunt1', birthDate: '1994-03-12', deceased: false, city: 'Addis Ababa', country: 'Ethiopia', notes: 'Same age, grew up together.', favorite: true, createdAt: T },
  { id: 'f-c2', name: 'Samuel Haile', role: 'cousin', side: 'maternal', parentId: 'f-aunt1', birthDate: '1997-08-25', deceased: false, city: 'Addis Ababa', country: 'Ethiopia', notes: '', favorite: false, createdAt: T },
  { id: 'f-c3', name: 'Liya Bekele', role: 'cousin', side: 'maternal', parentId: 'f-uncle1', birthDate: '2001-01-08', deceased: false, city: 'Dubai', country: 'United Arab Emirates', notes: '', favorite: false, createdAt: T },

  // Paternal line
  { id: 'f-pgm', name: 'Marta Isaak', role: 'grandmother', side: 'paternal', birthDate: '1941-09-17', deceased: false, city: 'Asmara', country: 'Eritrea', notes: '', favorite: false, createdAt: T },
  { id: 'f-pgf', name: 'Tesfay Isaak', role: 'grandfather', side: 'paternal', birthDate: '1937-06-01', deceased: true, deceasedYear: '2003', city: 'Asmara', country: 'Eritrea', notes: '', favorite: false, createdAt: T },
  { id: 'f-dad', name: 'Isaak Tesfay', role: 'father', side: 'paternal', birthDate: '1963-12-05', deceased: false, city: 'Zürich', country: 'Switzerland', notes: '', favorite: true, createdAt: T },
  { id: 'f-uncle2', name: 'Daniel Tesfay', role: 'uncle', side: 'paternal', birthDate: '1968-10-22', deceased: false, city: 'Oslo', country: 'Norway', notes: '', favorite: false, createdAt: T },
  { id: 'f-c4', name: 'Ruth Daniel', role: 'cousin', side: 'paternal', parentId: 'f-uncle2', birthDate: '1999-04-19', deceased: false, city: 'Oslo', country: 'Norway', notes: '', favorite: false, createdAt: T },

  // The extended branch: grandfather's brother, his daughter (dad's cousin),
  // and her son (your second cousin). Toggle "distant kin" to fold it away.
  { id: 'f-gunc', name: 'Haile Isaak', role: 'great-aunt-uncle', side: 'paternal', birthDate: '1940-03-08', deceased: true, deceasedYear: '2015', city: 'Asmara', country: 'Eritrea', notes: "Grandfather Tesfay's brother.", favorite: false, createdAt: T },
  { id: 'f-pcous', name: 'Senait Haile', role: 'parents-cousin', side: 'paternal', parentId: 'f-gunc', birthDate: '1970-01-26', deceased: false, city: 'London', country: 'United Kingdom', notes: "Dad's cousin.", favorite: false, createdAt: T },
  { id: 'f-2c', name: 'Yohannes Senait', role: 'second-cousin', side: 'paternal', parentId: 'f-pcous', birthDate: '2002-07-30', deceased: false, city: 'London', country: 'United Kingdom', notes: '', favorite: false, createdAt: T },

  // Your own line
  { id: 'f-sib1', name: 'Hanna', role: 'sibling', side: 'own', birthDate: '1996-06-11', deceased: false, city: 'Zürich', country: 'Switzerland', notes: '', favorite: true, createdAt: T },
  { id: 'f-sib2', name: 'Mikael', role: 'sibling', side: 'own', birthDate: '2000-02-28', deceased: false, city: 'Basel', country: 'Switzerland', notes: '', favorite: false, createdAt: T },
  { id: 'f-niece', name: 'Sara', role: 'nibling', side: 'own', parentId: 'f-sib1', birthDate: '2022-09-03', deceased: false, city: 'Zürich', country: 'Switzerland', notes: '', favorite: false, createdAt: T },
];
