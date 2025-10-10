import '../scss/main.scss';
import { initTheme, wireThemeUI } from './theme-switcher';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  wireThemeUI(); // engancha a <select data-theme-select> si existe
});