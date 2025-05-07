import { db } from './firebase-config';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { renderProducts } from './products';
import { renderBlogs } from './blogs';
import { showProductDetail } from './products';
import './styles.css';

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

// Código para manejar el menú móvil
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del menú móvil
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenuClose = document.querySelector('.mobile-menu-close');
    const nav = document.querySelector('nav');
    const body = document.body;

    // Crear el overlay para cuando el menú está abierto
    const menuOverlay = document.createElement('div');
    menuOverlay.className = 'menu-overlay';
    body.appendChild(menuOverlay);

    // Función para abrir el menú
    function openMenu() {
        nav.classList.add('active');
        menuOverlay.classList.add('active');
        body.style.overflow = 'hidden'; // Prevenir scroll
    }

    // Función para cerrar el menú
    function closeMenu() {
        nav.classList.remove('active');
        menuOverlay.classList.remove('active');
        body.style.overflow = ''; // Restaurar scroll
    }

    // Evento para abrir menú
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', openMenu);
    }

    // Eventos para cerrar menú
    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', closeMenu);
    }

    menuOverlay.addEventListener('click', closeMenu);

    // Cerrar menú al seleccionar un enlace
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Cerrar menú al redimensionar la ventana a tamaño desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            closeMenu();
        }
    });
});

// Cargar datos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Inicializar texto circular en elementos de carga
    createCircularText();
    
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
    const match = path.match(/\/#mezclas\/([^\/]+)/);
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

// Función auxiliar para regenerar el texto circular cuando se actualizan los elementos DOM
export function refreshCircularText() {
  setTimeout(createCircularText, 100);
}

