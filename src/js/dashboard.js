// Dashboard entry point for webpack
// Importar estilos para que webpack los procese
import '../styles.css';
import '../styles/dashboard.css';
import '../styles/notifications.css';
import '../styles/mixes.css';

// Importar módulos de funcionalidad
import './auth/auth-check.js';
import { onAuthStateChange, logout, getUserData } from './services/authService.js';
import { loadUserMixes, openMixModal, closeMixModal, saveMix, deleteMix, loadHerbsForSelection } from './dashboard/mixes.js';
import { showSuccessNotification, showErrorNotification, showWarningNotification, showInfoNotification } from './utils/notifications.js';
import { initBlogManagement } from './dashboard/blogs.js';

// Hacer las notificaciones disponibles globalmente para otros módulos
window.notifications = {
    showSuccessNotification,
    showErrorNotification,
    showWarningNotification,
    showInfoNotification
};

document.addEventListener('DOMContentLoaded', () => {
    const userNameElement = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');
    const logoutLink = document.getElementById('logout-link');
    
    // Elementos para mezclas
    const addMixBtn = document.getElementById('add-mix-btn');
    const closeMixModalBtn = document.getElementById('close-mix-modal');
    const mixForm = document.getElementById('mix-form');
    const userMixesList = document.getElementById('user-mixes-list');

    // Manejo de pestañas mejorado
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');

    const isTabAccessible = (tabId) => {
        const tab = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
        if (!tab) {
            return false;
        }

        return tab.hidden !== true && tab.dataset.disabled !== 'true';
    };

    // Función para cambiar de tab con animación
    const switchTab = (tabId) => {
        // Desactivar todas las tabs
        tabLinks.forEach(link => link.classList.remove('active'));
        
        // Activar la tab seleccionada
        const selectedTab = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
        if (!selectedTab || selectedTab.hidden === true || selectedTab.dataset.disabled === 'true') {
            return;
        }

        selectedTab.classList.add('active');
        
        // Ocultar con animación el contenido actual
        tabPanes.forEach(pane => {
            if (pane.classList.contains('active')) {
                pane.style.opacity = '0';
                pane.style.transform = 'translateY(10px)';
                
                // Después de la animación de salida, ocultar el panel y mostrar el nuevo
                setTimeout(() => {
                    pane.classList.remove('active');
                    
                    // Mostrar el panel seleccionado
                    const selectedPane = document.getElementById(tabId);
                    if (selectedPane && !selectedPane.hasAttribute('aria-hidden')) {
                        selectedPane.classList.add('active');
                        // Forzar reflow para asegurar la animación
                        void selectedPane.offsetWidth;
                        // Animar entrada
                        selectedPane.style.opacity = '1';
                        selectedPane.style.transform = 'translateY(0)';
                    }
                }, 150);
            }
        });
    };

    // Verificar si hay un hash en la URL para activar la tab correspondiente
    const activateTabFromHash = () => {
        const hash = window.location.hash.substring(1);
        if (hash && isTabAccessible(hash)) {
            switchTab(hash);
        }
    };

    // Activar tab inicial según URL o por defecto
    activateTabFromHash();
    
    // Event listeners para las pestañas
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');

            if (!isTabAccessible(tabId)) {
                return;
            }

            // Actualizar URL con hash
            history.pushState(null, null, `#${tabId}`);
            
            switchTab(tabId);
        });
    });

    // Manejar cambios en la URL (navegación por botones atrás/adelante)
    window.addEventListener('popstate', activateTabFromHash);

    onAuthStateChange(async (user) => {
        if (user) {
            // Usuario está logueado
            const userData = await getUserData(user.uid);
            if (userData.success) {
                if (userNameElement) userNameElement.textContent = userData.data.name || 'Usuario';
                if (userEmailElement) userEmailElement.textContent = userData.data.email || '';

                initBlogManagement({ ...userData.data, uid: user.uid });
                activateTabFromHash();

                // Cargar datos para el perfil
                if (document.getElementById('profile-name')) {
                    document.getElementById('profile-name').value = userData.data.name || '';
                }
                if (document.getElementById('profile-email')) {
                    document.getElementById('profile-email').value = userData.data.email || '';
                }

                // Cargar mezclas del usuario
                loadUserMixes(user.uid);
                // Cargar hierbas para el modal de mezclas
                loadHerbsForSelection();
            } else {
                if (userNameElement) userNameElement.textContent = 'Usuario';
                if (userEmailElement) userEmailElement.textContent = '';
            }

            // Event listener para el formulario de perfil
            const profileForm = document.getElementById('profile-form');
            if (profileForm) {
                profileForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const name = document.getElementById('profile-name').value;
                    try {
                        // Actualizar el perfil del usuario
                        const result = await updateUserProfile(user.uid, { name });
                        if (result.success) {
                            showSuccessNotification('Perfil actualizado con éxito');
                            userNameElement.textContent = name;
                        } else {
                            showErrorNotification('Error al actualizar el perfil');
                        }
                    } catch (error) {
                        console.error('Error al actualizar el perfil:', error);
                        showErrorNotification('Error al actualizar el perfil');
                    }
                });
            }

            if (logoutLink) {
                logoutLink.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await logout();
                    window.location.href = 'login.html';
                });
            }

            // Event listeners para mezclas
            if (addMixBtn) {
                addMixBtn.addEventListener('click', () => {
                    openMixModal();
                });
            }
            if (closeMixModalBtn) closeMixModalBtn.addEventListener('click', () => closeMixModal());
            if (mixForm) mixForm.addEventListener('submit', (e) => saveMix(e, user.uid));

            // Event listener para la lista de mezclas (editar/eliminar)
            if (userMixesList) {
                userMixesList.addEventListener('click', (e) => {
                    if (e.target.classList.contains('edit-mix-btn') || e.target.closest('.edit-mix-btn')) {
                        const mixItem = e.target.closest('.mix-item');
                        if (mixItem) {
                            const mixId = mixItem.dataset.id;
                            openMixModal(mixId);
                        }
                    }
                    if (e.target.classList.contains('delete-mix-btn') || e.target.closest('.delete-mix-btn')) {
                        const mixItem = e.target.closest('.mix-item');
                        if (mixItem) {
                            const mixId = mixItem.dataset.id;
                            deleteMix(mixId, user.uid);
                        }
                    }
                });
            }

        } else {
            // Usuario no está logueado, redirigir a login
            if (window.location.pathname.endsWith('dashboard.html')) {
                window.location.href = 'login.html';
            }
        }
    });
});

// Función para actualizar el perfil del usuario
async function updateUserProfile(userId, userData) {
    try {
        // Implementar la función para actualizar los datos del usuario en Firebase
        const { updateDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../firebase-config.js');
        
        await updateDoc(doc(db, 'users', userId), userData);
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        return { success: false, error };
    }
}
