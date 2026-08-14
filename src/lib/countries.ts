export interface Country {
  name: string;
  /** Regional-indicator flag emoji. */
  flag: string;
}

/**
 * Countries offered in the add/edit autocomplete. Free text is still allowed,
 * so this list is a convenience, not a constraint — add a row to extend it and
 * the flag shows up everywhere a place is displayed.
 */
export const COUNTRIES: Country[] = [
  { name: 'Eritrea', flag: '🇪🇷' },
  { name: 'Ethiopia', flag: '🇪🇹' },
  { name: 'Switzerland', flag: '🇨🇭' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'Norway', flag: '🇳🇴' },
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'United States', flag: '🇺🇸' },
  { name: 'United Arab Emirates', flag: '🇦🇪' },
  { name: 'Uganda', flag: '🇺🇬' },
  { name: 'South Sudan', flag: '🇸🇸' },
  { name: 'China', flag: '🇨🇳' },
];

/**
 * Common ways people type these countries, so "USA", "UK" or "UAE" still get a
 * flag. Keys are compared lowercased with punctuation and spaces stripped.
 */
const ALIASES: Record<string, string> = {
  usa: 'United States',
  us: 'United States',
  unitedstatesofamerica: 'United States',
  america: 'United States',
  uk: 'United Kingdom',
  greatbritain: 'United Kingdom',
  britain: 'United Kingdom',
  england: 'United Kingdom',
  scotland: 'United Kingdom',
  wales: 'United Kingdom',
  uae: 'United Arab Emirates',
  emirates: 'United Arab Emirates',
  dubai: 'United Arab Emirates',
  swiss: 'Switzerland',
  schweiz: 'Switzerland',
  deutschland: 'Germany',
  norge: 'Norway',
  ssudan: 'South Sudan',
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

const BY_KEY = new Map<string, Country>();
for (const c of COUNTRIES) BY_KEY.set(norm(c.name), c);

/** The flag for a country name, or '' when it isn't one we know. */
export function countryFlag(name: string | undefined): string {
  if (!name) return '';
  const key = norm(name);
  const direct = BY_KEY.get(key);
  if (direct) return direct.flag;
  const alias = ALIASES[key];
  return alias ? (BY_KEY.get(norm(alias))?.flag ?? '') : '';
}

/** "🇪🇷 Asmara, Eritrea" — the flag only appears when we recognise the country. */
export function placeLabel(city?: string, country?: string): string {
  const text = [city, country].filter(Boolean).join(', ');
  if (!text) return '';
  const flag = countryFlag(country);
  return flag ? `${flag} ${text}` : text;
}
