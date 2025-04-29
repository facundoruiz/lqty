// Variables para la paginación de blogs
let allBlogs = []; // Todos los blogs disponibles
let currentBlogIndex = 0; // Índice actual para cargar más blogs
const BLOGS_PER_PAGE = 4; // Número de blogs a mostrar por página

// Renderizar blogs en la página con paginación
export function renderBlogs(blogs) {
    const container = document.getElementById('blogs-container');
    const loadMoreBtn = document.getElementById('load-more-blogs');
    const endOfBlogsMsg = document.getElementById('end-of-blogs');
    
    // Guardar todos los blogs para cargarlos progresivamente
    allBlogs = blogs;
    
    if (!blogs.length) {
      container.innerHTML = '<div class="no-results">No se encontraron blogs</div>';
      loadMoreBtn.style.display = 'none';
      endOfBlogsMsg.style.display = 'none';
      return;
    }
    
    // Mostrar los primeros 5 blogs (o menos si no hay suficientes)
    const blogsToShow = blogs.slice(0, BLOGS_PER_PAGE);
    currentBlogIndex = blogsToShow.length;
    
    container.innerHTML = blogsToShow.map(blog => `
      <div class="blog-card" data-id="${blog.id}">
        <div class="blog-image">
          <img src="${blog.image_path || './img/logo_gris.jpeg'}" alt="${blog.title}" />
        </div>
        <div class="blog-info">
          <h3 class="blog-post-title">${blog.title}</h3>
 
          <p class="blog-excerpt">${blog.excerpt}</p>
          <a href="#" class="read-more" data-id="${blog.id}">Leer más</a>
        </div>
      </div>
    `).join('');
    
    // Agregar event listeners a los enlaces "Leer más"
    addReadMoreListeners(container, blogs);
    
    // Mostrar u ocultar el botón "Cargar Más" según corresponda
    if (currentBlogIndex < blogs.length) {
      loadMoreBtn.style.display = 'inline-block';
      endOfBlogsMsg.style.display = 'none';
      
      // Agregar evento al botón "Cargar Más"
      loadMoreBtn.addEventListener('click', loadMoreBlogs);
    } else {
      loadMoreBtn.style.display = 'none';
      endOfBlogsMsg.style.display = 'block';
    }
}

// Función para cargar más blogs
function loadMoreBlogs() {
    const container = document.getElementById('blogs-container');
    const loadMoreBtn = document.getElementById('load-more-blogs');
    const endOfBlogsMsg = document.getElementById('end-of-blogs');
    
    // Calcula cuántos blogs más cargar
    const remainingBlogs = allBlogs.length - currentBlogIndex;
    const nextBlogsCount = Math.min(BLOGS_PER_PAGE, remainingBlogs);
    
    if (nextBlogsCount <= 0) {
        loadMoreBtn.style.display = 'none';
        endOfBlogsMsg.style.display = 'block';
        return;
    }
    
    // Obtener los siguientes blogs
    const nextBlogs = allBlogs.slice(currentBlogIndex, currentBlogIndex + nextBlogsCount);
    currentBlogIndex += nextBlogsCount;
    
    // Crear elementos HTML para los nuevos blogs
    const newBlogsHTML = nextBlogs.map(blog => `
      <div class="blog-card" data-id="${blog.id}">
        <div class="blog-image">
          <img src="${blog.image_path || './img/logo_gris.jpeg'}" alt="${blog.title}" />
        </div>
        <div class="blog-info">
          <h3 class="blog-post-title">${blog.title}</h3>
 
          <p class="blog-excerpt">${blog.excerpt}</p>
          <a href="#" class="read-more" data-id="${blog.id}">Leer más</a>
        </div>
      </div>
    `).join('');
    
    // Agregar los nuevos blogs al final del contenedor
    container.insertAdjacentHTML('beforeend', newBlogsHTML);
    
    // Agregar event listeners a los nuevos enlaces "Leer más"
    addReadMoreListeners(container, allBlogs);
    
    // Actualizar la visibilidad del botón "Cargar Más"
    if (currentBlogIndex >= allBlogs.length) {
        loadMoreBtn.style.display = 'none';
        endOfBlogsMsg.style.display = 'block';
    }
}

// Función auxiliar para agregar event listeners a los enlaces "Leer más"
function addReadMoreListeners(container, blogs) {
    container.querySelectorAll('.read-more, .blog-card').forEach(link => {
        // Verificar si el elemento ya tiene un listener para evitar duplicados
        const blogId = link.dataset.id;
        // Remover listener existente si lo hubiera (usando cloneNode)
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        // Agregar nuevo listener
        newLink.addEventListener('click', (e) => {
            e.preventDefault();
            const blogId = newLink.dataset.id;
            const blog = blogs.find(b => b.id === blogId);
            showBlogDetail(blog);
        });
    });
}

// Mostrar detalle del blog
export function showBlogDetail(blog) {
  const modal = document.getElementById('blog-modal');
  const modalBody = document.getElementById('modal-body');
  const closeModal = document.getElementById('close-modal');
  
  if (!modal || !modalBody || !closeModal) {
    console.error("Elementos del modal no encontrados en el DOM.");
    return;
  }
  
  // Obtener el contenido del disclaimer principal
  const mainDisclaimer = document.querySelector('.disclaimer-content p');
  const disclaimerText = mainDisclaimer ? mainDisclaimer.textContent : 
      'La información proporcionada en este sitio web es solo para fines informativos y educativos. No pretende diagnosticar, tratar, curar o prevenir ninguna enfermedad. Consulte siempre con un profesional de la salud calificado antes de usar cualquier producto o tratamiento.';
  
  modalBody.innerHTML = `
    <div class="modal-product-header">
        <h2>${blog.title}  <button class="disclaimer-btn" title="Declinación de responsabilidad">
            <i class="bi bi-exclamation-triangle"></i>
        </button></h2>
    </div>
    <div class="modal-disclaimer-container" style="display: none;">
        <p>${disclaimerText}</p>
    </div>
    <p>${blog.excerpt}</p>
    <img src="${blog.image_path || './img/logo_gris.jpeg'}" alt="${blog.title}" />
    <p>${blog.content || 'Contenido no disponible'}</p>
  `;
  
  // Función para cerrar el modal
  const close = () => {
    modal.classList.remove('visible');
    // Esperar a que termine la animación antes de ocultar completamente
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300); // Debe coincidir con la duración de la transición en CSS
    
    // Remover los event listeners para evitar duplicados
    closeModal.removeEventListener('click', close);
    window.removeEventListener('click', closeOutside);
  };
  
  // Función para cerrar al hacer clic fuera
  const closeOutside = (event) => {
    if (event.target === modal) {
      close();
    }
  };
  // Agregar evento para el declinador de responsabilidad
  const disclaimerBtn = modalBody.querySelector('.disclaimer-btn');
  const disclaimerContainer = modalBody.querySelector('.modal-disclaimer-container');
  
  disclaimerBtn.addEventListener('click', () => {
      disclaimerContainer.style.display = 
          disclaimerContainer.style.display === 'none' ? 'block' : 'none';
  });
  // Mostrar el modal y agregar clase visible para la animación
  modal.style.display = 'flex';
  // Usar setTimeout para asegurar que se aplique la transición
  setTimeout(() => {
    modal.classList.add('visible');
  }, 10);
  
  // Agregar event listeners para cerrar
  closeModal.addEventListener('click', close);
  window.addEventListener('click', closeOutside);
}