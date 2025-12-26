import { getAuthInstance, getDb } from '../../firebase-config';

// Helper functions to get Firebase functions from CDN
const getFirebaseAuth = () => window.firebase.auth;
const getFirebaseFirestore = () => window.firebase.firestore;

// Proveedor para autenticación con Google
let googleProvider = null;

/**
 * Registro de usuario con email y contraseña
 * @param {string} email - Correo electrónico del usuario
 * @param {string} password - Contraseña del usuario
 * @param {object} userData - Datos adicionales del usuario (nombre, etc.)
 * @returns {Promise} - Resultado de la operación
 */
export const registerWithEmail = async (email, password, userData) => {
    try {
        const auth = await getAuthInstance();
        const db = await getDb();
        const createUserWithEmailAndPassword = getFirebaseAuth().createUserWithEmailAndPassword;
        const serverTimestamp = getFirebaseFirestore().serverTimestamp;
        // Crear el usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // Crear el registro en la colección de usuarios
        await createUserInFirestore(user.uid, {
            ...userData,
            email,
            role: 'user',
            createdAt: serverTimestamp()
        });

        return { success: true, user };
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        return { success: false, error: translateAuthError(error) };
    }
};

/**
 * Inicio de sesión con email y contraseña
 * @param {string} email - Correo electrónico del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise} - Resultado de la operación
 */
export const loginWithEmail = async (email, password) => {
    try {
    const auth = await getAuthInstance();
    const signInWithEmailAndPassword = getFirebaseAuth().signInWithEmailAndPassword;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        return { success: false, error: translateAuthError(error) };
    }
};

/**
 * Inicio de sesión con Google
 * @returns {Promise} - Resultado de la operación
 */
export const loginWithGoogle = async () => {
    try {
        const auth = await getAuthInstance();
        if (!googleProvider) {
            const GoogleAuthProvider = getFirebaseAuth().GoogleAuthProvider;
            googleProvider = new GoogleAuthProvider();
            // Pedir selección de cuenta para evitar entrar con cuenta no deseada
            try {
                googleProvider.setCustomParameters({ prompt: 'select_account' });
            } catch (e) {
                // Algunos polyfills o versiones pueden no soportar setCustomParameters
            }
        }
        const signInWithPopup = getFirebaseAuth().signInWithPopup;
        const signInWithRedirect = getFirebaseAuth().signInWithRedirect;
        let userCredential;
        try {
            userCredential = await signInWithPopup(auth, googleProvider);
        } catch (popupError) {
            // Si el popup está bloqueado o fue cerrado, intentar redirect como fallback
            console.warn('signInWithPopup failed, attempting redirect fallback:', popupError);
            const code = popupError && popupError.code ? popupError.code : '';
            if (code.includes('popup') || code.includes('blocked')) {
                try {
                    await signInWithRedirect(auth, googleProvider);
                    // signInWithRedirect no devolverá credencial aquí porque redirige la página.
                    return { success: true, redirect: true };
                } catch (redirErr) {
                    console.error('Redirect sign-in also failed:', redirErr);
                    return { success: false, error: translateAuthError(redirErr) };
                }
            }
            // Si no es un error de popup, relanzarlo para el manejo general
            throw popupError;
        }
        const user = userCredential.user;
        const db = await getDb();
        const doc = getFirebaseFirestore().doc;
        const getDoc = getFirebaseFirestore().getDoc;
        const serverTimestamp = getFirebaseFirestore().serverTimestamp;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
            await createUserInFirestore(user.uid, {
                name: user.displayName || '',
                email: user.email || '',
                role: 'user',
                createdAt: serverTimestamp()
            });
        }
        return { success: true, user };
    } catch (error) {
        console.error('Error al iniciar sesión con Google:', error);
        return { success: false, error: translateAuthError(error) };
    }
};

/**
 * Inicio de sesión anónimo
 * @returns {Promise} - Resultado de la operación
 */
export const loginAnonymously = async () => {
    try {
        const auth = await getAuthInstance();
        const signInAnonymously = getFirebaseAuth().signInAnonymously;
        const serverTimestamp = getFirebaseFirestore().serverTimestamp;
        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;
        await createUserInFirestore(user.uid, {
            name: 'Usuario Anónimo',
            email: '',
            role: 'user',
            isAnonymous: true,
            createdAt: serverTimestamp()
        });
        return { success: true, user };
    } catch (error) {
        console.error('Error al iniciar sesión anónimo:', error);
        return { success: false, error: translateAuthError(error) };
    }
};

/**
 * Cerrar sesión
 * @returns {Promise} - Resultado de la operación
 */
export const logout = async () => {
    try {
    const auth = await getAuthInstance();
    const signOut = getFirebaseAuth().signOut;
    await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        return { success: false, error: translateAuthError(error) };
    }
};

/**
 * Enviar correo para restablecer contraseña
 * @param {string} email - Correo electrónico del usuario
 * @returns {Promise} - Resultado de la operación
 */
export const resetPassword = async (email) => {
    try {
        const auth = await getAuthInstance();
        const sendPasswordResetEmail = getFirebaseAuth().sendPasswordResetEmail;
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        console.error('Error al enviar correo para restablecer contraseña:', error);
        return { success: false, error: translateAuthError(error) };
    }
};

/**
 * Obtener información del usuario actual
 * @returns {object} - Usuario autenticado o null
 */
export const getCurrentUser = () => {
    // Devolver el usuario actual solicitando la instancia de auth (lazy)
    return (async () => {
        const auth = await getAuthInstance();
        return auth.currentUser;
    })();
};

/**
 * Crear un nuevo documento de usuario en Firestore
 * @param {string} userId - ID del usuario
 * @param {object} userData - Datos del usuario
 * @returns {Promise} - Resultado de la operación
 */
const createUserInFirestore = async (userId, userData) => {
    try {
        const db = await getDb();
        const doc = getFirebaseFirestore().doc;
        const setDoc = getFirebaseFirestore().setDoc;
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, userData);
        return { success: true };
    } catch (error) {
        console.error('Error al crear usuario en Firestore:', error);
        throw error;
    }
};

/**
 * Obtener los datos del usuario desde Firestore
 * @param {string} userId - ID del usuario
 * @returns {Promise} - Resultado de la operación
 */
export const getUserData = async (userId) => {
    try {
        const db = await getDb();
        const doc = getFirebaseFirestore().doc;
        const getDoc = getFirebaseFirestore().getDoc;
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            return { success: true, data: { id: userDoc.id, ...userDoc.data() } };
        } else {
            return { success: false, error: 'Usuario no encontrado' };
        }
    } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Observar cambios en el estado de autenticación
 * @param {function} callback - Función a ejecutar cuando cambia el estado
 * @returns {function} - Función para dejar de observar
 */
export const onAuthStateChange = (callback) => {
    return (async () => {
        const auth = await getAuthInstance();
        const onAuthStateChanged = getFirebaseAuth().onAuthStateChanged;
        return onAuthStateChanged(auth, callback);
    })();
};

/**
 * Traducir códigos de error de Firebase Auth a mensajes en español
 * @param {object} error - Objeto de error de Firebase
 * @returns {string} - Mensaje de error en español
 */
const translateAuthError = (error) => {
    const errorCode = error.code;
    
    const errorMessages = {
        'auth/email-already-in-use': 'El correo electrónico ya está en uso.',
        'auth/invalid-email': 'El formato del correo electrónico no es válido.',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
        'auth/user-not-found': 'No existe usuario con este correo electrónico.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
        'auth/popup-closed-by-user': 'Inicio de sesión cancelado.',
    'auth/popup-blocked': 'La ventana emergente fue bloqueada por el navegador.',
    'auth/cancelled-popup-request': 'Solicitud de inicio de sesión cancelada.',
        'auth/operation-not-allowed': 'Esta operación no está permitida.',
        'auth/requires-recent-login': 'Por favor, inicie sesión de nuevo para continuar.',
        'auth/too-many-requests': 'Demasiados intentos fallidos. Por favor, inténtelo más tarde.'
    };
    
    return errorMessages[errorCode] || error.message || 'Ha ocurrido un error. Por favor, inténtalo de nuevo.';
};