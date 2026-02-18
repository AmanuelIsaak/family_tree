import { $ } from '../utils/helpers.js';

export function toggleTheme(renderTree) {
  const h = document.documentElement;
  const n = h.dataset.theme === 'dark' ? 'light' : 'dark';
  h.dataset.theme = n;
  $('themeBtn').textContent = n === 'dark' ? '☀' : '☾';
  try { localStorage.setItem('ft_theme', n); } catch (e) { /* ignore */ }
  renderTree();
}

export function initTheme() {
  try {
    const s = localStorage.getItem('ft_theme');
    if (s) {
      document.documentElement.dataset.theme = s;
      $('themeBtn').textContent = s === 'dark' ? '☀' : '☾';
    }
  } catch (e) { /* ignore */ }
}
