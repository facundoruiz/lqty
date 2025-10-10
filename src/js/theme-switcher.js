// Cambia <html data-theme="..."> y persiste en localStorage
const THEME_KEY = 'app.theme';
export const THEMES = ['default','patrios','comerciales','navidad','halloween'];

export function applyTheme(theme) {
  const t = THEMES.includes(theme) ? theme : 'default';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(THEME_KEY, t);
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'default';
  applyTheme(saved);
}

export function wireThemeUI(selector = '[data-theme-select]') {
  const el = document.querySelector(selector);
  if (!el) return;
  el.addEventListener('change', e => applyTheme(e.target.value));
}