import { onAuthStateChange, logout, getUserData } from './services/authService.js';
import { showErrorNotification, showSuccessNotification } from './utils/notifications.js';

const statusEl = () => document.getElementById('admin-status');

const setStatus = (text) => {
  const el = statusEl();
  if (el) el.textContent = text;
};

export const initAdminAuth = async () => {
  setStatus('Verificando acceso...');

  return new Promise((resolve) => {
    onAuthStateChange(async (user) => {
      if (!user) {
        window.location.href = 'login.html';
        return;
      }

      const userData = await getUserData(user.uid);
      if (!userData.success || userData.data.role !== 'admin') {
        showErrorNotification('Acceso restringido. Se requiere rol admin.');
        window.location.href = 'forbidden.html';
        return;
      }

      const nameEl = document.getElementById('admin-user-name');
      const emailEl = document.getElementById('admin-user-email');
      if (nameEl) nameEl.textContent = userData.data.name || 'Admin';
      if (emailEl) emailEl.textContent = userData.data.email || user.email || '';

      const logoutBtn = document.getElementById('admin-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          await logout();
          showSuccessNotification('Sesión cerrada');
          window.location.href = 'login.html';
        });
      }

      setStatus('Listo');
      resolve(userData.data);
    });
  });
};
