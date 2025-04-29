import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { renderProducts } from './products';
import { renderBlogs } from './blogs';
import { showProductDetail } from './products';
import './styles.css';


// Configuración de Firebase (deberás reemplazar esto con tus propias credenciales)
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variable global para almacenar blogs (o pasarla a través de funciones)
let allBlogs = []; 

// Cargar datos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Cargar productos
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Cargar blogs
    const blogsSnapshot = await getDocs(collection(db, 'blogs'));
    allBlogs = blogsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Renderizar inicialmente pasando ambos arrays
    renderProducts(products, allBlogs); 
    renderBlogs(allBlogs);
    
    // Configurar filtrado pasando ambos arrays
    setupFilters(products, allBlogs);

    // Verificar si hay un ID en la URL
    const path = window.location.pathname;
    console.log('Current path:', path); // Para debugging
    const match = path.match(/\/mezcla\/([^\/]+)/);
    if (match) {
      const productId = match[1];
      console.log('Product ID from URL:', productId); // Para debugging
      const product = products.find(p => p.id === productId);
      if (product) {
        console.log('Product found:', product); // Para debugging
        showProductDetail(product, allBlogs);
      } else {
        console.error('Producto no encontrado con ID:', productId);
      }
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
});

// Configurar filtros
function setupFilters(products, blogs) { // Aceptar blogs
  const categoryFilter = document.getElementById('category-filter');
  const searchInput = document.getElementById('search');
  
  // Asegurarse de que los elementos existen antes de añadir listeners
  if (categoryFilter) {
      categoryFilter.addEventListener('change', () => {
        filterProducts(products, blogs, categoryFilter.value, searchInput?.value); // Pasar blogs
      });
  }
  
  if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterProducts(products, blogs, categoryFilter?.value, searchInput.value); // Pasar blogs
      });
  }
}

// Filtrar productos
function filterProducts(products, blogs, category, searchTerm) { // Aceptar blogs
  let filtered = [...products];
  
  if (category && category !== 'all') {
    filtered = filtered.filter(product => product.category === category);
  }
  
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    // Ajustar filtro si product.name no existe, usar product.title
    filtered = filtered.filter(product => 
      (product.title?.toLowerCase() || '').includes(term) || 
      (product.description?.toLowerCase() || '').includes(term)
    );
  }
  
  renderProducts(filtered, blogs); // Pasar blogs al renderizar filtrados
}

