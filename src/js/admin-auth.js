import { onAuthStateChange, logout, getUserData } from './services/authService.js';
import { showErrorNotification, showSuccessNotification } from './utils/notifications.js';

const statusEl = () => document.getElementById('admin-status');
const loaderTextEl = () => document.getElementById('admin-auth-loader-text');
const bodyEl = () => document.body;

const setStatus = (text) => {
  const el = statusEl();
  if (el) el.textContent = text;

  const loaderText = loaderTextEl();
  if (loaderText) loaderText.textContent = text;
};

const revealAdminApp = () => {
  const body = bodyEl();
  if (!body) return;

  body.classList.remove('admin-auth-loading');
  body.setAttribute('aria-busy', 'false');
};

export const initAdminAuth = async () => {
  setStatus('Verificando acceso...');

  return new Promise((resolve) => {
    onAuthStateChange(async (user) => {
      if (!user) {
        setStatus('Redirigiendo al login...');
        window.location.href = 'login.html';
        return;
      }

      const userData = await getUserData(user.uid);
      if (!userData.success || userData.data.role !== 'admin') {
        setStatus('Acceso denegado. Redirigiendo...');
        showErrorNotification('Acceso restringido. Se requiere rol admin.');
        window.location.href = 'forbidden.html';
        return;
      }

      const nameEl = document.getElementById('admin-user-name');
      const emailEl = document.getElementById('admin-user-email');
      if (nameEl) nameEl.textContent = userData.data.name || 'Admin';
      if (emailEl) emailEl.textContent = userData.data.email || user.email || '';

      const logoutBtn = document.getElementById('admin-logout');
      if (logoutBtn && !logoutBtn.dataset.bound) {
        logoutBtn.dataset.bound = 'true';
        logoutBtn.addEventListener('click', async () => {
          await logout();
          showSuccessNotification('Sesion cerrada');
          window.location.href = 'login.html';
        });
      }

      setStatus('Listo');
      revealAdminApp();
      resolve(userData.data);
    });
  });
};
