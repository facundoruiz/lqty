import '../../styles.css';
import { loginWithEmail, loginWithGoogle, loginAnonymously, resetPassword } from '../services/authService.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const googleLoginButton = document.getElementById('google-login');
    const anonymousLoginButton = document.getElementById('anonymous-login');
    const forgotPasswordLink = document.getElementById('forgot-password');
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

    // Iniciar sesión con email y contraseña
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                showMessage('Por favor, completa todos los campos', true);
                return;
            }

            try {
                showMessage('Iniciando sesión...', false);
                const result = await loginWithEmail(email, password);
                if (result.success) {
                    showMessage('Inicio de sesión exitoso. Redirigiendo...', false);
                    // Redirigir al dashboard después de un breve retraso
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    showMessage(result.error, true);
                }
            } catch (error) {
                console.error('Error al iniciar sesión:', error);
                showMessage('Error al iniciar sesión. Por favor, inténtalo de nuevo.', true);
            }
        });
    }

    // Iniciar sesión con Google
    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', async () => {
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

    // Iniciar sesión de forma anónima
    if (anonymousLoginButton) {
        anonymousLoginButton.addEventListener('click', async () => {
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

    // Restablecer contraseña
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt('Por favor, ingresa tu correo electrónico para restablecer la contraseña:');
            if (email) {
                try {
                    showMessage('Enviando correo de restablecimiento...', false);
                    const result = await resetPassword(email);
                    if (result.success) {
                        showMessage('Se ha enviado un correo para restablecer tu contraseña.', false);
                    } else {
                        showMessage(result.error, true);
                    }
                } catch (error) {
                    console.error('Error al restablecer contraseña:', error);
                    showMessage('Error al intentar restablecer la contraseña.', true);
                }
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