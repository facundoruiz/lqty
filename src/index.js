import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from './firebase-config';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { renderProducts } from './products';
import { renderBlogs } from './blogs';
import { showProductDetail } from './products';
import './styles.css';

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

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

// Variable global para almacenar blogs y el último documento
window.allBlogs = [];
window.currentBlogIndex = 0;
let lastVisibleBlog = null;
const BLOGS_PER_PAGE = 4;
// Variable global para almacenar blogs (o pasarla a través de funciones)
let allBlogs = []; 

// Función para crear el texto circular animado en los elementos de carga
function createCircularText() {
  const loadingElements = document.querySelectorAll('.loading');
  
  if (loadingElements.length) {
    loadingElements.forEach(loadingElement => {
      // Eliminar texto existente si lo hubiera
      const existingText = loadingElement.querySelector('.loading-text');
      if (existingText) {
        existingText.remove();
      }
      
      // Crear el contenedor para el texto circular
      const textContainer = document.createElement('div');
      textContainer.className = 'loading-text';
      
      // El texto que queremos mostrar de forma circular
      const text = 'La que tomo Yo! • Bienestar Natural • ';
      
      // Calcular el ángulo para cada letra para distribuirlas uniformemente
      const anglePerLetter = 360 / text.length;
      
      // Crear cada letra como un elemento span independiente
      for (let i = 0; i < text.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.innerText = text[i];
        
        // Calcular el ángulo para esta letra
        const angle = anglePerLetter * i;
        
        // Aplicar transformación para posicionar la letra
        charSpan.style.transform = `rotate(${angle}deg) translate(0, -100px)`;
        
        // Añadir al contenedor
        textContainer.appendChild(charSpan);
      }
      
      // Añadir el contenedor de texto al elemento de carga
      loadingElement.appendChild(textContainer);
    });
  }
}

// Cargar datos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Iniciando carga de datos...');
    
    // Inicializar texto circular en elementos de carga
    createCircularText();
    
    // Cargar productos
    console.log('Cargando productos...');
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log('Productos cargados:', products.length);
    
    // Cargar primera página de blogs
    console.log('Cargando blogs...');
    const blogsQuery = query(
      collection(db, 'blogs'),
      orderBy('createdAt', 'desc'),
      limit(BLOGS_PER_PAGE)
    );
    
    console.log('Ejecutando consulta de blogs...');
    const blogsSnapshot = await getDocs(blogsQuery);
    console.log('Resultado de la consulta:', blogsSnapshot.empty ? 'vacío' : 'con datos');
    console.log('Número de documentos:', blogsSnapshot.docs.length);
    
    if (blogsSnapshot.empty) {
      console.log('No se encontraron blogs en la colección');
      renderBlogs([], false);
      return;
    }
    
    const blogs = blogsSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Procesando blog:', doc.id, data);
      return {
        id: doc.id,
        ...data
      };
    });
    
    console.log('Blogs procesados:', blogs.length);
    console.log('Detalles de blogs:', blogs);
    
    // Actualizar allBlogs con los blogs cargados
    window.allBlogs = [...blogs];
    window.currentBlogIndex = blogs.length;
    console.log('allBlogs actualizado:', window.allBlogs.length);
    console.log('currentBlogIndex:', window.currentBlogIndex);
    
    // Guardar el último documento para la paginación
    lastVisibleBlog = blogsSnapshot.docs[blogsSnapshot.docs.length - 1];
    console.log('Último documento visible:', lastVisibleBlog?.id);
    
    // Renderizar inicialmente
    console.log('Renderizando productos y blogs...');
    renderProducts(products, blogs);
    renderBlogs(blogs, blogsSnapshot.docs.length === BLOGS_PER_PAGE, false); // false = no append
    
    // Configurar filtrado
    setupFilters(products, blogs);

    // Verificar si hay un ID en la URL
    const path = window.location.pathname;
    console.log('Current path:', path); // Para debugging
    const match = path.match(/\/#mezclas\/([^\/]+)/);
    if (match) {
      const productId = match[1];
      console.log('Product ID from URL:', productId); // Para debugging
      const product = products.find(p => p.id === productId);
      if (product) {
        console.log('Product found:', product); // Para debugging
        showProductDetail(product, window.allBlogs);
      } else {
        console.error('Producto no encontrado con ID:', productId);
      }
    }

    // Agregar event listener al botón de cargar más
    const loadMoreBtn = document.getElementById('load-more-blogs');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', window.loadMoreBlogs);
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
});

// Configurar filtros
function setupFilters(products, blogs) {
    // Filtros de productos
    const categoryFilter = document.getElementById('category-filter');
    const searchInput = document.getElementById('search');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            filterProducts(products, blogs, categoryFilter.value, searchInput?.value);
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            filterProducts(products, blogs, categoryFilter?.value, searchInput.value);
        });
    }

    // Filtros de blogs
    const blogSearch = document.getElementById('blog-search');
    const blogCategoryFilter = document.getElementById('blog-category-filter');

    if (blogSearch) {
        blogSearch.addEventListener('input', () => {
            filterBlogs(blogs, blogSearch.value, blogCategoryFilter?.value);
        });
    }

    if (blogCategoryFilter) {
        blogCategoryFilter.addEventListener('change', () => {
            filterBlogs(blogs, blogSearch?.value, blogCategoryFilter.value);
        });
    }
}

// Filtrar productos
function filterProducts(products, blogs, category, searchTerm) {
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
  
  renderProducts(filtered, blogs);
}

// Función para filtrar blogs
function filterBlogs(blogs, searchTerm = '', category = 'all') {
    let filtered = [...blogs];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(blog => 
            (blog.title?.toLowerCase() || '').includes(term) || 
            (blog.excerpt?.toLowerCase() || '').includes(term) ||
            (blog.content?.toLowerCase() || '').includes(term)
        );
    }
    
    // Filtrar por categoría
    if (category && category !== 'all') {
        filtered = filtered.filter(blog => blog.category === category);
    }
    
    // Renderizar blogs filtrados
    renderBlogs(filtered, false); // false porque no queremos mostrar el botón de cargar más en resultados filtrados
}

// Función para cargar más blogs
window.loadMoreBlogs = async function() {
  try {
    console.log('Cargando más blogs...');
    
    // Deshabilitar el botón mientras se cargan los datos
    const loadMoreBtn = document.getElementById('load-more-blogs');
    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'Cargando...';
    }
    
    const blogsQuery = query(
      collection(db, 'blogs'),
      orderBy('createdAt', 'desc'),
      startAfter(lastVisibleBlog),
      limit(BLOGS_PER_PAGE)
    );
    
    const blogsSnapshot = await getDocs(blogsQuery);
    
    if (blogsSnapshot.empty) {
      console.log('No hay más blogs para cargar');
      
      if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
      }
      
      const endOfBlogsMsg = document.getElementById('end-of-blogs');
      if (endOfBlogsMsg) {
        endOfBlogsMsg.style.display = 'block';
      }
      
      return;
    }
    
    const newBlogs = blogsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('Nuevos blogs cargados:', newBlogs.length);
    
    // Actualizar allBlogs con los nuevos blogs
    window.allBlogs = [...window.allBlogs, ...newBlogs];
    
    // Actualizar el último documento visible
    lastVisibleBlog = blogsSnapshot.docs[blogsSnapshot.docs.length - 1];
    
    // Renderizar los nuevos blogs (append=true)
    renderBlogs(newBlogs, blogsSnapshot.docs.length === BLOGS_PER_PAGE, true); // true = append
    
    // Restaurar el estado del botón
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Cargar Más Fichas';
    }
  } catch (error) {
    console.error("Error loading more blogs:", error);
    
    // Restaurar el estado del botón en caso de error
    const loadMoreBtn = document.getElementById('load-more-blogs');
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Cargar Más Fichas';
    }
  }
};
  renderProducts(filtered, blogs); // Pasar blogs al renderizar filtrados
}

// Función auxiliar para regenerar el texto circular cuando se actualizan los elementos DOM
export function refreshCircularText() {
  setTimeout(createCircularText, 100);
}

