// Configuración de Firebase usando CDN (externalizado)
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
    // Usar Firebase desde el CDN (disponible globalmente)
    _app = window.firebase.initializeApp(firebaseConfig);
    return _app;
}

export async function getDb() {
    if (_db) return _db;
    await initApp();
    // Usar Firebase desde el CDN (disponible globalmente)
    _db = window.firebase.firestore.getFirestore(_app);
    return _db;
}

export async function getAuthInstance() {
    if (_auth) return _auth;
    await initApp();
    // Usar Firebase desde el CDN (disponible globalmente)
    _auth = window.firebase.auth.getAuth(_app);
    return _auth;
}