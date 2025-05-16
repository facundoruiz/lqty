import { onAuthStateChange } from '../services/authService.js';

// Esta función verifica si el usuario está autenticado y redirige al login si no lo está
document.addEventListener('DOMContentLoaded', () => {
    let authChecked = false;
    
    // Verificar estado de autenticación
    onAuthStateChange((user) => {
        if (!authChecked) {
            authChecked = true;
            
            if (!user) {
                // El usuario no está autenticado, redirigir al login
                window.location.href = 'login.html';
            }
        }
    });
    
    // Si después de 2 segundos no se ha verificado la autenticación, redirigir por seguridad
    setTimeout(() => {
        if (!authChecked) {
            window.location.href = 'login.html';
        }
    }, 2000);
});