import { getDb } from './firebase-config';
import { renderProducts, renderHerbsCarousel } from './products';
import { renderBlogs } from './blogs';
import { showProductDetail } from './products';
import { getCart, subscribe as subscribeCart, clearCart, removeFromCart, updateQuantity } from './js/cart.js';

import './scss/main.scss';

import './styles/notifications.css';
import { initTheme, applyTheme } from './js/theme-switcher';

// Exponer applyTheme globalmente para debugging en consola
window.applyTheme = applyTheme;

// Variable global para almacenar blogs (o pasarla a través de funciones)
window.allBlogs = [];

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

// Canasto (carrito) y checkout
document.addEventListener('DOMContentLoaded', () => {
  const cartModal = document.getElementById('cart-modal');
  const cartModalBody = document.getElementById('cart-modal-body');
  const cartModalFooter = document.getElementById('cart-modal-footer');
  const closeCartBtn = document.getElementById('close-cart-modal');
  const cartToggle = document.getElementById('cart-toggle');
  const cartBadge = document.getElementById('cart-badge');

  const cartFloat = document.getElementById('cart-float');
  function updateBadge() {
    const count = getCart().reduce((s, i) => s + i.quantity, 0);
    if (cartBadge) cartBadge.textContent = count;
    if (cartFloat) {
      cartFloat.style.display = count > 0 ? '' : 'none';
      cartFloat.setAttribute('aria-hidden', count > 0 ? 'false' : 'true');
    }
  }
  subscribeCart(updateBadge);
  updateBadge();

  function openCartModal() {
    if (!cartModal || !cartModalBody || !cartModalFooter) return;
    renderCartListView();
    cartModal.style.display = 'flex';
    cartModal.classList.add('visible');
  }

  function closeCartModal() {
    if (cartModal) {
      cartModal.classList.remove('visible');
      cartModal.style.display = 'none';
    }
  }

  function renderCartListView() {
    const items = getCart();
    if (items.length === 0) {
      cartModalBody.innerHTML = '<p class="cart-empty">El canasto está vacío. Agregá productos desde la sección Productos.</p>';
      cartModalFooter.innerHTML = '<button type="button" class="btn" id="cart-close-btn">Cerrar</button>';
      cartModalFooter.querySelector('#cart-close-btn')?.addEventListener('click', closeCartModal);
      return;
    }
    cartModalBody.innerHTML = `
      <h3 class="cart-modal-title"><i class="bi bi-basket"></i> Tu canasto</h3>
      <ul class="cart-list">
        ${items.map(item => {
          const gramos = item.gramos ?? '';
          const label = item.gramos ? `${item.title} - ${item.gramos}gr` : item.title;
          return `
          <li class="cart-item" data-id="${item.productId}" data-gramos="${gramos}">
            <img src="${item.image_path || 'asset/img/logo_gris.jpeg'}" alt="" class="cart-item-img" />
            <div class="cart-item-info">
              <span class="cart-item-title">${label}</span>
              <div class="cart-item-qty">
                <button type="button" class="cart-qty-btn" data-id="${item.productId}" data-gramos="${gramos}" data-delta="-1" aria-label="Menos"><i class="bi bi-dash"></i></button>
                <span>× ${item.quantity}</span>
                <button type="button" class="cart-qty-btn" data-id="${item.productId}" data-gramos="${gramos}" data-delta="1" aria-label="Más"><i class="bi bi-plus"></i></button>
              </div>
            </div>
            <button type="button" class="cart-remove-btn" data-id="${item.productId}" data-gramos="${gramos}" aria-label="Quitar"><i class="bi bi-trash"></i></button>
          </li>
        `;
        }).join('')}
      </ul>
    `;
    cartModalFooter.innerHTML = '<button type="button" class="btn btn-primary" id="cart-checkout-btn"><i class="bi bi-arrow-right-circle"></i> Continuar al checkout</button>';
    const parseGramos = (v) => (v !== '' && v != null ? parseInt(v, 10) : null);
    cartModalBody.querySelectorAll('.cart-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        removeFromCart(btn.dataset.id, parseGramos(btn.dataset.gramos));
        renderCartListView();
      });
    });
    cartModalBody.querySelectorAll('.cart-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const gramos = parseGramos(btn.dataset.gramos);
        const delta = parseInt(btn.dataset.delta, 10);
        const item = items.find(i => i.productId === id && (i.gramos ?? null) === gramos);
        if (item) updateQuantity(id, gramos, item.quantity + delta);
        renderCartListView();
      });
    });
    cartModalFooter.querySelector('#cart-checkout-btn')?.addEventListener('click', () => renderCheckoutView());
  }

  function renderCheckoutView() {
    const items = getCart();
    cartModalBody.innerHTML = `
      <h3 class="cart-modal-title">Completar pedido</h3>
      <form id="checkout-form" class="checkout-form">
        <div class="form-row">
          <label>Nombre y Apellido</label>
          <input type="text" name="nombre" required placeholder="Nombre" />
          <small>El nombre es obligatorio para la entrega. (Nombre y Apellido)</small>
        </div>
        
        <div class="form-row">
          <label>Teléfono</label>
          <input type="tel" name="telefono" required placeholder="Ej: 381 1234-5678" />
          <small>El teléfono es obligatorio para la entrega. (Ej: 381 1234-5678)</small>
        </div>
        <div class="form-row">
          <label>Tipo de entrega</label>
          <div class="radio-group">
            <label class="radio-label"><input type="radio" name="tipo_entrega" value="retirar" checked /> Retirar en el local</label>
            <label class="radio-label"><input type="radio" name="tipo_entrega" value="domicilio" /> Enviar a domicilio</label>
          </div>
        </div>
        <div class="form-row checkout-domicilio-row" style="display: none;">
          <label>Domicilio</label>
          <input type="text" name="domicilio" placeholder="Calle, número, localidad, CP" />
          <small>El domicilio es obligatorio para la entrega. (Calle, número, localidad, CP)</small>
        </div>
        <div class="form-row">
          <label>Notas</label>
          <textarea name="notas" rows="2" placeholder="Indicaciones o comentarios del pedido"></textarea>
          <small>Las notas son opcionales.</small>
        </div>
      </form>
      <div class="checkout-detalle">
        <h4><i class="bi bi-list-ul"></i> Detalle del pedido</h4>
        <ul class="cart-list">
          ${items.map(item => {
            const label = item.gramos ? `${item.title} - ${item.gramos}gr` : item.title;
            return `
            <li class="cart-item cart-item-readonly">
              <img src="${item.image_path || 'asset/img/logo_gris.jpeg'}" alt="" class="cart-item-img" />
              <div class="cart-item-info">
                <span class="cart-item-title">${label}</span>
                <span class="cart-item-qty-readonly">× ${item.quantity}</span>
              </div>
            </li>
          `;
          }).join('')}
        </ul>
      </div>
    `;
    cartModalFooter.innerHTML = '<button type="button" class="btn" id="checkout-back-btn"><i class="bi bi-arrow-left"></i> Volver</button><button type="submit" form="checkout-form" class="btn btn-primary" id="checkout-submit-btn"><i class="bi bi-send"></i> Enviar pedido</button>';

    const form = cartModalBody.querySelector('#checkout-form');
    const domicilioRow = cartModalBody.querySelector('.checkout-domicilio-row');
    const radios = cartModalBody.querySelectorAll('input[name="tipo_entrega"]');
    radios.forEach(r => {
      r.addEventListener('change', () => {
        if (domicilioRow) domicilioRow.style.display = r.value === 'domicilio' ? '' : 'none';
      });
    });

    cartModalFooter.querySelector('#checkout-back-btn')?.addEventListener('click', () => renderCartListView());
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const tipo = formData.get('tipo_entrega');
      if (tipo === 'domicilio' && !formData.get('domicilio')?.trim()) {
        alert('Por favor indicá el domicilio de entrega.');
        return;
      }
      const pedido = {
        nombre: formData.get('nombre'),
        telefono: formData.get('telefono'),
        tipo_entrega: tipo,
        domicilio: tipo === 'domicilio' ? formData.get('domicilio') : '',
        notas: formData.get('notas') || '',
        items: getCart(),
        fecha: new Date().toISOString(),
      };

      function showSendingState() {
        cartModalBody.innerHTML = `
          <div class="order-state order-sending-state">
            <div class="order-sending-leaves" aria-hidden="true">
              <span class="leaf leaf-1">🌿</span>
              <span class="leaf leaf-2">🍃</span>
              <span class="leaf leaf-3">🌼</span>
              <span class="leaf leaf-4">🌾</span>
              <span class="leaf leaf-5">🍃</span>
            </div>
            <p class="order-state-title">Enviando tu pedido...</p>
            <p class="order-state-sub">Un momento por favor</p>
          </div>
        `;
        cartModalFooter.innerHTML = '';
      }
      function showSuccessState() {
        cartModalBody.innerHTML = `
          <div class="order-state order-success-state">
            <div class="order-state-icon"><i class="bi bi-check-circle-fill"></i></div>
            <p class="order-state-title">¡Pedido enviado!</p>
            <p class="order-state-sub">Te contactaremos a la brevedad.</p>
          </div>
        `;
        cartModalFooter.innerHTML = '<button type="button" class="btn btn-primary" id="order-close-btn">Cerrar</button>';
        cartModalFooter.querySelector('#order-close-btn')?.addEventListener('click', () => {
          closeCartModal();
        });
      }
      function showErrorState(message) {
        cartModalBody.innerHTML = `
          <div class="order-state order-error-state">
            <div class="order-state-icon"><i class="bi bi-exclamation-triangle-fill"></i></div>
            <p class="order-state-title">No se pudo enviar</p>
            <p class="order-state-sub">${message}</p>
          </div>
        `;
        cartModalFooter.innerHTML = '<button type="button" class="btn" id="order-back-btn">Volver</button><button type="button" class="btn btn-primary" id="order-retry-btn">Reintentar</button>';
        cartModalFooter.querySelector('#order-back-btn')?.addEventListener('click', () => renderCheckoutView());
        cartModalFooter.querySelector('#order-retry-btn')?.addEventListener('click', () => form?.requestSubmit());
      }

      showSendingState();
      try {
        const db = await getDb();
        const { collection, addDoc } = window.firebase.firestore;
        await addDoc(collection(db, 'orders'), pedido);
        showSuccessState();
        clearCart();
        updateBadge();
      } catch (err) {
        console.error('Error al guardar pedido:', err);
        showErrorState(err?.message || 'Intentá de nuevo más tarde.');
      }
    });
  }

  if (cartToggle) cartToggle.addEventListener('click', openCartModal);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartModal);
  if (cartModal) {
    cartModal.addEventListener('click', (e) => { if (e.target === cartModal) closeCartModal(); });
  }
});

// Función para verificar parámetros de URL al cargar la página
function checkURLParameters(products, blogs) {
  // Obtener los parámetros de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const mezclaId = urlParams.get('mezcla');
  
  if (mezclaId) {
    // Buscar la mezcla con ese ID
    const product = products.find(p => p.id === mezclaId);
    
    if (product) {
      // Mostrar el modal con la mezcla encontrada
      showProductDetail(product, blogs);
    } else {
      console.error('Mezcla no encontrada con ID:', mezclaId);
    }
  }
}

// Cargar datos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar tema automáticamente según la fecha
  const month = new Date().getMonth() + 1; // 1-12
  const day = new Date().getDate();
  
  let selectedTheme = 'default';
  if (month === 12) {
    selectedTheme = 'navidad';
  } else if (month === 10 && day >= 22) {
    selectedTheme = 'halloween';
  } else if ((month === 5 && day >= 18 && day <= 25) || (month === 7 && day === 9) || (month === 4 && day ===2) || month === 6 && day === 20) {
    selectedTheme = 'patrios';
  }
  
  console.log(`Aplicando tema: ${selectedTheme} (mes: ${month}, día: ${day})`);
  applyTheme(selectedTheme);

  try {
    // Inicializar texto circular en elementos de carga
    createCircularText();
    
  // Cargar productos (inicializa Firestore solo cuando se necesita)
  const db = await getDb();
  const collection = window.firebase.firestore.collection;
  const getDocs = window.firebase.firestore.getDocs;
  const productsSnapshot = await getDocs(collection(db, 'products'));
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  // Filtrar solo productos con publish_web = 1
    .filter(product => product.publish_web === "1");
      // Cargar blogs
  const blogsSnapshot = await getDocs(collection(db, 'blogs'));
    window.allBlogs = blogsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));      // Renderizar inicialmente pasando ambos arrays
    renderProducts(products, window.allBlogs); 
    renderHerbsCarousel(products).catch(console.error); // Renderizar el carrusel con manejo de errores
    renderBlogs(window.allBlogs);
    
    // Configurar filtrado pasando ambos arrays
    setupFilters(products, window.allBlogs);
    
  // Verificar parámetros en la URL
  checkURLParameters(products, window.allBlogs);

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
  renderHerbsCarousel(filtered).catch(console.error); // También actualizar el carrusel con manejo de errores
}

// Función auxiliar para regenerar el texto circular cuando se actualizan los elementos DOM
export function refreshCircularText() {
  setTimeout(createCircularText, 100);
}

