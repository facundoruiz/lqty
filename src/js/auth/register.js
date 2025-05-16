import '../../styles.css';
import { registerWithEmail, loginWithGoogle, loginAnonymously } from '../services/authService.js';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const googleRegisterButton = document.getElementById('google-register');
    const anonymousRegisterButton = document.getElementById('anonymous-register'); // Añadir esta línea
    const authMessage = document.getElementById('auth-message');

    // Verificar si ya hay una sesión activa, en ese caso redirigir al dashboard
    const userId = localStorage.getItem('user_id');
    if (userId) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Función para mostrar mensajes al usuario
    const showMessage = (message, isError = false) => {
        authMessage.textContent = message;
        authMessage.className = isError ? 'auth-message error' : 'auth-message success';
        authMessage.style.display = 'block';

        // Ocultar el mensaje después de 5 segundos
        setTimeout(() => {
            authMessage.style.display = 'none';
        }, 5000);
    };

    // Registrarse con email y contraseña
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (!name || !email || !password || !confirmPassword) {
                showMessage('Por favor, completa todos los campos', true);
                return;
            }
            
            if (password !== confirmPassword) {
                showMessage('Las contraseñas no coinciden', true);
                return;
            }
            
            if (password.length < 6) {
                showMessage('La contraseña debe tener al menos 6 caracteres', true);
                return;
            }
            
            try {
                showMessage('Creando cuenta...', false);
                const result = await registerWithEmail(email, password, { name });
                
                if (result.success) {
                    showMessage('Registro exitoso. Redirigiendo...', false);
                    
                    // Redirigir al dashboard después de un breve retraso
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    showMessage(result.error, true);
                }
            } catch (error) {
                console.error('Error al registrar usuario:', error);
                showMessage('Error al crear la cuenta. Por favor, inténtalo de nuevo.', true);
            }
        });
    }

    // Registrarse con Google
    if (googleRegisterButton) {
        googleRegisterButton.addEventListener('click', async () => {
            try {
                showMessage('Iniciando sesión con Google...', false);
                const result = await loginWithGoogle();
                
                if (result.success) {
                    window.location.href = 'dashboard.html';
                } else {
                    showMessage(result.error, true);
                }
            } catch (error) {
                console.error('Error al iniciar sesión con Google:', error);
                showMessage('Error al iniciar sesión con Google. Por favor, inténtalo de nuevo.', true);
            }
        });
    }

    // Registrarse de forma anónima
    if (anonymousRegisterButton) {
        anonymousRegisterButton.addEventListener('click', async () => {
            try {
                showMessage('Iniciando sesión de forma anónima...', false);
                const result = await loginAnonymously();

                if (result.success) {
                    window.location.href = 'dashboard.html';
                } else {
                    showMessage(result.error, true);
                }
            } catch (error) {
                console.error('Error al iniciar sesión de forma anónima:', error);
                showMessage('Error al iniciar sesión de forma anónima. Por favor, inténtalo de nuevo.', true);
            }
        });
    }

    // Agregar manejo para el menú móvil
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenuClose = document.querySelector('.mobile-menu-close');
    const nav = document.querySelector('nav');
    const menuOverlay = document.querySelector('.menu-overlay');
    
    if (mobileMenuToggle && mobileMenuClose && nav && menuOverlay) {
        mobileMenuToggle.addEventListener('click', () => {
            nav.classList.add('active');
            menuOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        mobileMenuClose.addEventListener('click', () => {
            nav.classList.remove('active');
            menuOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });

        menuOverlay.addEventListener('click', () => {
            nav.classList.remove('active');
            menuOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
});