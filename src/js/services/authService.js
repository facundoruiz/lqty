import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    GoogleAuthProvider, 
    signInWithPopup,
    signInAnonymously,
    sendPasswordResetEmail,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase-config';

// Proveedor para autenticación con Google
const googleProvider = new GoogleAuthProvider();

/**
 * Registro de usuario con email y contraseña
 * @param {string} email - Correo electrónico del usuario
 * @param {string} password - Contraseña del usuario
 * @param {object} userData - Datos adicionales del usuario (nombre, etc.)
 * @returns {Promise} - Resultado de la operación
 */
export const registerWithEmail = async (email, password, userData) => {
    try {
        // Crear el usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Crear el registro en la colección de usuarios
        await createUserInFirestore(user.uid, {
            ...userData,
            email,
            role: 'usuario',
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
        const userCredential = await signInWithPopup(auth, googleProvider);
        const user = userCredential.user;
        
        // Verificar si el usuario ya existe en Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
            // Si no existe, crear el registro en la colección de usuarios
            await createUserInFirestore(user.uid, {
                name: user.displayName || '',
                email: user.email || '',
                role: 'usuario',
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
        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;
        
        // Crear el registro en la colección de usuarios
        await createUserInFirestore(user.uid, {
            name: 'Usuario Anónimo',
            email: '',
            role: 'usuario',
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
    return auth.currentUser;
};

/**
 * Crear un nuevo documento de usuario en Firestore
 * @param {string} userId - ID del usuario
 * @param {object} userData - Datos del usuario
 * @returns {Promise} - Resultado de la operación
 */
const createUserInFirestore = async (userId, userData) => {
    try {
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
    return onAuthStateChanged(auth, callback);
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
        'auth/operation-not-allowed': 'Esta operación no está permitida.',
        'auth/requires-recent-login': 'Por favor, inicie sesión de nuevo para continuar.',
        'auth/too-many-requests': 'Demasiados intentos fallidos. Por favor, inténtelo más tarde.'
    };
    
    return errorMessages[errorCode] || error.message || 'Ha ocurrido un error. Por favor, inténtalo de nuevo.';
};