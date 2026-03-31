import '../styles.css';
import '../styles/dashboard.css';
import '../styles/notifications.css';
import '../styles/mixes.css';

import './auth/auth-check.js';
import { onAuthStateChange, logout, getUserData } from './services/authService.js';
import { showSuccessNotification, showErrorNotification, showWarningNotification, showInfoNotification } from './utils/notifications.js';
import {
    ensureOrderNotificationPermission,
    getOrderCustomer,
    getOrderItemsSummary,
    showBrowserOrderNotification,
    subscribeToOrdersRealtime
} from './services/orderNotifications.js';

window.notifications = {
    showSuccessNotification,
    showErrorNotification,
    showWarningNotification,
    showInfoNotification
};

const getFirebaseFirestore = () => window.firebase.firestore;

let unsubscribeAdminOrderFeed = null;

async function initAdminOrderFeed() {
    if (typeof unsubscribeAdminOrderFeed === 'function') {
        return;
    }

    await ensureOrderNotificationPermission({
        notifyGranted: () => {
            showSuccessNotification('Notificaciones del navegador activadas para pedidos nuevos.');
        },
        notifyDenied: () => {
            showWarningNotification(
                'Las notificaciones del navegador quedaron bloqueadas. Los avisos seguiran apareciendo dentro del dashboard.',
                9000
            );
        }
    });

    unsubscribeAdminOrderFeed = await subscribeToOrdersRealtime({
        onNewOrder: (order) => {
            const customer = getOrderCustomer(order);
            const itemsSummary = getOrderItemsSummary(order.items);
            const message =
                itemsSummary === '-'
                    ? `Nuevo pedido de ${customer}.`
                    : `Nuevo pedido de ${customer}: ${itemsSummary}`;

            showInfoNotification(message, 8000);
            showBrowserOrderNotification(order, () => window.focus());
        },
        onError: (error) => {
            console.error('Error escuchando pedidos desde dashboard:', error);
            showWarningNotification('No se pudo activar la escucha en tiempo real de pedidos.', 8000);
        }
    });
}

function stopAdminOrderFeed() {
    if (typeof unsubscribeAdminOrderFeed === 'function') {
        unsubscribeAdminOrderFeed();
        unsubscribeAdminOrderFeed = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const userNameElement = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');
    const logoutLink = document.getElementById('logout-link');

    const addMixBtn = document.getElementById('add-mix-btn');
    const closeMixModalBtn = document.getElementById('close-mix-modal');
    const mixForm = document.getElementById('mix-form');
    const userMixesList = document.getElementById('user-mixes-list');

    const tabLinks = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');

    const isTabAccessible = (tabId) => {
        const tab = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
        if (!tab) {
            return false;
        }

        return tab.hidden !== true && tab.dataset.disabled !== 'true';
    };

    const switchTab = (tabId) => {
        tabLinks.forEach((link) => link.classList.remove('active'));

        const selectedTab = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
        if (!selectedTab || selectedTab.hidden === true || selectedTab.dataset.disabled === 'true') {
            return;
        }

        selectedTab.classList.add('active');

        tabPanes.forEach((pane) => {
            if (!pane.classList.contains('active')) {
                return;
            }

            pane.style.opacity = '0';
            pane.style.transform = 'translateY(10px)';

            setTimeout(() => {
                pane.classList.remove('active');

                const selectedPane = document.getElementById(tabId);
                if (selectedPane && !selectedPane.hasAttribute('aria-hidden')) {
                    selectedPane.classList.add('active');
                    void selectedPane.offsetWidth;
                    selectedPane.style.opacity = '1';
                    selectedPane.style.transform = 'translateY(0)';
                }
            }, 150);
        });
    };

    const activateTabFromHash = () => {
        const hash = window.location.hash.substring(1);
        if (hash && isTabAccessible(hash)) {
            switchTab(hash);
        }
    };

    activateTabFromHash();

    tabLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const tabId = link.getAttribute('data-tab');

            if (!isTabAccessible(tabId)) {
                return;
            }

            history.pushState(null, null, `#${tabId}`);
            switchTab(tabId);
        });
    });

    window.addEventListener('popstate', activateTabFromHash);

    onAuthStateChange(async (user) => {
        if (!user) {
            stopAdminOrderFeed();

            if (window.location.pathname.endsWith('dashboard.html')) {
                window.location.href = 'login.html';
            }
            return;
        }

        const userData = await getUserData(user.uid);
        if (userData.success) {
            if (userNameElement) userNameElement.textContent = userData.data.name || 'Usuario';
            if (userEmailElement) userEmailElement.textContent = userData.data.email || '';

            if (userData.data.role === 'admin') {
                await initAdminOrderFeed();
            } else {
                stopAdminOrderFeed();
            }

            try {
                const mixesModule = await import('./dashboard/mixes.js');
                const blogsModule = await import('./dashboard/blogs.js');

                if (blogsModule && typeof blogsModule.initBlogManagement === 'function') {
                    blogsModule.initBlogManagement({ ...userData.data, uid: user.uid });
                }

                if (mixesModule) {
                    window.loadUserMixes = mixesModule.loadUserMixes;
                    window.loadHerbsForSelection = mixesModule.loadHerbsForSelection;
                    window.openMixModal = mixesModule.openMixModal;
                    window.deleteMix = mixesModule.deleteMix;

                    if (typeof mixesModule.loadUserMixes === 'function') mixesModule.loadUserMixes(user.uid);
                    if (typeof mixesModule.loadHerbsForSelection === 'function') mixesModule.loadHerbsForSelection();

                    if (addMixBtn) {
                        addMixBtn.addEventListener('click', () => mixesModule.openMixModal());
                    }
                    if (closeMixModalBtn) {
                        closeMixModalBtn.addEventListener('click', () => mixesModule.closeMixModal());
                    }
                    if (mixForm) {
                        mixForm.addEventListener('submit', (event) => mixesModule.saveMix(event, user.uid));
                    }

                    if (userMixesList) {
                        userMixesList.addEventListener('click', (event) => {
                            if (event.target.classList.contains('edit-mix-btn') || event.target.closest('.edit-mix-btn')) {
                                const mixItem = event.target.closest('.mix-item');
                                if (mixItem) {
                                    mixesModule.openMixModal(mixItem.dataset.id);
                                }
                            }

                            if (event.target.classList.contains('delete-mix-btn') || event.target.closest('.delete-mix-btn')) {
                                const mixItem = event.target.closest('.mix-item');
                                if (mixItem) {
                                    mixesModule.deleteMix(mixItem.dataset.id, user.uid);
                                }
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading dashboard modules:', error);
            }

            activateTabFromHash();

            const profileName = document.getElementById('profile-name');
            const profileEmail = document.getElementById('profile-email');
            if (profileName) profileName.value = userData.data.name || '';
            if (profileEmail) profileEmail.value = userData.data.email || '';

            if (typeof window.loadUserMixes === 'function') {
                window.loadUserMixes(user.uid);
            }
            if (typeof window.loadHerbsForSelection === 'function') {
                window.loadHerbsForSelection();
            }
        } else {
            stopAdminOrderFeed();
            if (userNameElement) userNameElement.textContent = 'Usuario';
            if (userEmailElement) userEmailElement.textContent = '';
        }

        const profileForm = document.getElementById('profile-form');
        if (profileForm && !profileForm.dataset.bound) {
            profileForm.dataset.bound = 'true';
            profileForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const name = document.getElementById('profile-name').value;

                try {
                    const result = await updateUserProfile(user.uid, { name });
                    if (result.success) {
                        showSuccessNotification('Perfil actualizado con exito');
                        if (userNameElement) userNameElement.textContent = name;
                    } else {
                        showErrorNotification('Error al actualizar el perfil');
                    }
                } catch (error) {
                    console.error('Error al actualizar el perfil:', error);
                    showErrorNotification('Error al actualizar el perfil');
                }
            });
        }

        if (logoutLink && !logoutLink.dataset.bound) {
            logoutLink.dataset.bound = 'true';
            logoutLink.addEventListener('click', async (event) => {
                event.preventDefault();
                stopAdminOrderFeed();
                await logout();
                window.location.href = 'login.html';
            });
        }
    });
});

async function updateUserProfile(userId, userData) {
    try {
        const updateDoc = getFirebaseFirestore().updateDoc;
        const doc = getFirebaseFirestore().doc;
        const { getDb } = await import('../firebase-config.js');
        const db = await getDb();
        await updateDoc(doc(db, 'users', userId), userData);
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        return { success: false, error };
    }
}
