/**
 * Sistema de notificaciones centralizado para el dashboard
 * Proporciona funcionalidades para mostrar notificaciones con diferentes tipos y estilos
 */

// Función principal para mostrar notificaciones
export const showNotification = (message, type = 'info', duration = 5000) => {
    // Verificar si ya existe un contenedor de notificaciones
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Configurar el icono según el tipo
    const iconClass = getIconClass(type);
    
    // Contenido de la notificación
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                <i class="bi ${iconClass}"></i>
            </div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" aria-label="Cerrar notificación">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    // Agregar evento para cerrar la notificación
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        closeNotification(notification);
    });
    
    // Agregar la notificación al contenedor
    notificationContainer.appendChild(notification);
    
    // Cerrar automáticamente después del tiempo especificado
    if (duration > 0) {
        setTimeout(() => {
            closeNotification(notification);
        }, duration);
    }
    
    return notification;
};

// Función para cerrar una notificación con animación
export const closeNotification = (notificationElement) => {
    if (!notificationElement || !notificationElement.parentNode) return;
    
    // Agregar clase para animación de salida
    notificationElement.classList.add('notification-exit');
    
    // Eliminar después de que termine la animación
    setTimeout(() => {
        if (notificationElement.parentNode) {
            notificationElement.parentNode.removeChild(notificationElement);
        }
    }, 300);
};

// Función para obtener la clase de icono según el tipo
const getIconClass = (type) => {
    const iconMap = {
        'success': 'bi-check-circle',
        'error': 'bi-exclamation-circle',
        'warning': 'bi-exclamation-triangle',
        'info': 'bi-info-circle'
    };
    
    return iconMap[type] || iconMap['info'];
};

// Funciones de conveniencia para tipos específicos
export const showSuccessNotification = (message, duration = 5000) => {
    return showNotification(message, 'success', duration);
};

export const showErrorNotification = (message, duration = 5000) => {
    return showNotification(message, 'error', duration);
};

export const showWarningNotification = (message, duration = 5000) => {
    return showNotification(message, 'warning', duration);
};

export const showInfoNotification = (message, duration = 5000) => {
    return showNotification(message, 'info', duration);
};

// Función para cerrar todas las notificaciones
export const closeAllNotifications = () => {
    const container = document.getElementById('notification-container');
    if (container) {
        const notifications = container.querySelectorAll('.notification');
        notifications.forEach(notification => {
            closeNotification(notification);
        });
    }
};

// Función para mostrar notificación persistente (no se cierra automáticamente)
export const showPersistentNotification = (message, type = 'info') => {
    return showNotification(message, type, 0);
};

// Inicializar los estilos de notificaciones (se carga automáticamente al importar el módulo)
const initNotificationStyles = () => {
    // Solo agregar si no existe ya el archivo CSS
    if (!document.querySelector('link[href*="notifications.css"]')) {
        console.log('Sistema de notificaciones inicializado. Asegúrate de incluir notifications.css en tu HTML.');
    }
};

// Inicializar al cargar el módulo
initNotificationStyles();
