// Inicialización perezosa de Firebase para evitar incluir el SDK en el bundle inicial
// Uso: const db = await getDb(); const auth = await getAuthInstance();
const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
};

let _app = null;
let _db = null;
let _auth = null;

async function initApp() {
    if (_app) return _app;
    const { initializeApp } = await import('firebase/app');
    _app = initializeApp(firebaseConfig);
    return _app;
}

export async function getDb() {
    if (_db) return _db;
    const app = await initApp();
    const { getFirestore } = await import('firebase/firestore');
    _db = getFirestore(app);
    return _db;
}

export async function getAuthInstance() {
    if (_auth) return _auth;
    const app = await initApp();
    const { getAuth } = await import('firebase/auth');
    _auth = getAuth(app);
    return _auth;
}