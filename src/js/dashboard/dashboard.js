// Este archivo puede estar vacío o contener la lógica específica del dashboard
import '../../styles.css';
import '../auth/auth-check.js'; // Corregir la ruta de importación
import { onAuthStateChange, logout, getUserData } from '../services/authService.js';
import { setupEventListeners, loadTasks, displayTasks, filterTasks, openTaskModal, closeTaskModal, saveTask, deleteTask, toggleTaskStatus } from './tasks.js'; // Asumiendo que tienes un tasks.js
import { loadUserMixes, openMixModal, closeMixModal, saveMix, deleteMix, loadHerbsForSelection } from './mixes.js'; // Importar funciones de mezclas

document.addEventListener('DOMContentLoaded', () => {
    const userNameElement = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');
    const logoutLink = document.getElementById('logout-link');
    const addTaskBtn = document.getElementById('add-task-btn');
    const closeModalBtn = document.getElementById('close-modal');
    const taskForm = document.getElementById('task-form');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const tasksList = document.getElementById('tasks-list');
    const taskModal = document.getElementById('task-modal');

    // Elementos para mezclas
    const addMixBtn = document.getElementById('add-mix-btn');
    const closeMixModalBtn = document.getElementById('close-mix-modal');
    const mixForm = document.getElementById('mix-form');
    const userMixesList = document.getElementById('user-mixes-list');

    // Manejo de pestañas mejorado
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Función para cambiar de tab con animación
    const switchTab = (tabId) => {
        // Desactivar todas las tabs
        tabLinks.forEach(link => link.classList.remove('active'));
        
        // Activar la tab seleccionada
        const selectedTab = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
        if (selectedTab) selectedTab.classList.add('active');
        
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
                    if (selectedPane) {
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
        if (hash && ['tasks', 'mixes', 'profile'].includes(hash)) {
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

                // Cargar datos para el perfil
                if (document.getElementById('profile-name')) {
                    document.getElementById('profile-name').value = userData.data.name || '';
                }
                if (document.getElementById('profile-email')) {
                    document.getElementById('profile-email').value = userData.data.email || '';
                }

                // Cargar tareas del usuario
                loadTasks(user.uid);
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
                            showNotification('Perfil actualizado con éxito', 'success');
                            userNameElement.textContent = name;
                        } else {
                            showNotification('Error al actualizar el perfil', 'error');
                        }
                    } catch (error) {
                        console.error('Error al actualizar el perfil:', error);
                        showNotification('Error al actualizar el perfil', 'error');
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

            // Event listeners para tareas
            if (addTaskBtn) addTaskBtn.addEventListener('click', () => openTaskModal());
            if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeTaskModal());
            if (taskForm) taskForm.addEventListener('submit', (e) => saveTask(e, user.uid));
            
            filterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    filterTasks(btn.getAttribute('data-filter'));
                });
            });

            if (tasksList) {
                tasksList.addEventListener('click', (e) => {
                    if (e.target.classList.contains('delete-task-btn')) {
                        const taskId = e.target.closest('.task-item').dataset.id;
                        deleteTask(taskId, user.uid);
                    }
                    if (e.target.classList.contains('edit-task-btn')) {
                        const taskId = e.target.closest('.task-item').dataset.id;
                        openTaskModal(taskId);
                    }
                    if (e.target.classList.contains('task-status-checkbox')) {
                        const taskId = e.target.closest('.task-item').dataset.id;
                        toggleTaskStatus(taskId, user.uid, e.target.checked);
                    }
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

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    // Crear el contenedor de notificación si no existe
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '1000';
        document.body.appendChild(notificationContainer);
    }
    
    // Crear la notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Estilo para la notificación
    notification.style.backgroundColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3';
    notification.style.color = 'white';
    notification.style.padding = '12px 20px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    // Añadir al contenedor
    notificationContainer.appendChild(notification);
    
    // Forzar reflow para que la transición funcione
    void notification.offsetWidth;
    
    // Mostrar con animación
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
    
    // Eliminar después de un tiempo
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            notificationContainer.removeChild(notification);
        }, 300);
    }, 3000);
}

// Función para actualizar el perfil del usuario
async function updateUserProfile(userId, userData) {
    try {
        // Implementar la función para actualizar los datos del usuario en Firebase
        // Esta es una implementación de ejemplo, deberás adaptarla según tu servicio
        const { updateDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../../firebase-config.js'); // Corregida la ruta de importación
        
        await updateDoc(doc(db, 'users', userId), userData);
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        return { success: false, error };
    }
}