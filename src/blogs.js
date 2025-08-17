import { getDocs, collection, query, orderBy, limit, startAfter, startAt, endBefore, limitToLast, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase-config';
import { refreshCircularText } from './index.js';

// Variables para la paginación de blogs
const BLOGS_PER_PAGE = 4; // Número de blogs a mostrar por página

// Cache para almacenar documentos de paginación y reducir consultas repetidas
const paginationCache = {
  firstPage: null,
  pages: new Map(), // Mapa para almacenar resultados de páginas por cursor
  isLastPage: false
};

/**
 * Obtiene blogs con paginación avanzada usando cursores de Firestore
 * @param {Object} options - Opciones de paginación
 * @param {Object} options.lastVisible - Documento cursor para "siguiente página" 
 * @param {Object} options.firstVisible - Documento cursor para "página anterior"
 * @param {Boolean} options.loadPrevious - Si es true, carga la página anterior
 * @param {Number} options.limitCount - Número de blogs a cargar
 * @returns {Object} - Resultado con blogs y cursores para navegación
 */
export async function fetchBlogs(options = {}) {
    const { 
        lastVisible = null, 
        firstVisible = null,
        loadPrevious = false,
        limitCount = BLOGS_PER_PAGE
    } = options;

    let blogsQuery;
    
    // Intentar usar caché si existe para la página solicitada
    const cacheKey = lastVisible?.id || firstVisible?.id || 'first';
    if (paginationCache.pages.has(cacheKey) && !loadPrevious) {
        console.log('Usando caché para clave:', cacheKey);
        return paginationCache.pages.get(cacheKey);
    }

    try {
        if (loadPrevious && firstVisible) {
            // Carga página anterior usando limitToLast y endBefore
            blogsQuery = query(
                collection(db, 'blogs'), 
                orderBy('created_at'), 
                endBefore(firstVisible), 
                limitToLast(limitCount)
            );
        } else if (lastVisible) {
            // Carga siguiente página
            blogsQuery = query(
                collection(db, 'blogs'), 
                orderBy('created_at'), 
                startAfter(lastVisible), 
                limit(limitCount)
            );
        } else {
            // Carga primera página
            blogsQuery = query(
                collection(db, 'blogs'), 
                orderBy('created_at'), 
                limit(limitCount)
            );
        }

        const blogsSnapshot = await getDocs(blogsQuery);
        
        if (blogsSnapshot.empty) {
            return {
                blogs: [],
                firstVisible: null,
                lastVisible: null,
                isFirstPage: true,
                isLastPage: true
            };
        }

        const blogs = blogsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Determinar si es primera o última página
        const isFirstPage = !lastVisible && !loadPrevious;
        const isLastPage = blogsSnapshot.docs.length < limitCount;

        // Guardar primera página para navegación
        if (isFirstPage) {
            paginationCache.firstPage = {
                firstVisible: null,
                lastVisible: blogsSnapshot.docs[blogsSnapshot.docs.length - 1],
                isFirstPage: true,
                isLastPage: isLastPage
            };
        }

        // Almacenar en caché esta página
        const result = {
            blogs,
            firstVisible: blogsSnapshot.docs[0] || null,
            lastVisible: blogsSnapshot.docs[blogsSnapshot.docs.length - 1] || null,
            isFirstPage: isFirstPage,
            isLastPage: isLastPage
        };
        
        paginationCache.pages.set(result.firstVisible?.id || 'first', result);
        if (isLastPage) {
            paginationCache.isLastPage = true;
        }

        return result;

    } catch (error) {
        console.error("Error fetching blogs:", error);
        throw error;
    }
}

// Función para obtener un blog específico por su ID
export async function fetchBlogById(blogId) {
    try {
        const blogRef = doc(db, 'blogs', blogId);
        const blogDoc = await getDoc(blogRef);
        
        if (blogDoc.exists()) {
            return {
                id: blogDoc.id,
                ...blogDoc.data()
            };
        } else {
            console.error(`Blog con ID ${blogId} no encontrado en la base de datos`);
            return null;
        }
    } catch (error) {
        console.error('Error al obtener el blog:', error);
        throw error;
    }
}

// Estados para el manejo de paginación
let paginationState = {
    isLoading: false,
    currentLastVisible: null,
    currentFirstVisible: null,
    isFirstPage: true,
    isLastPage: false
};

// Optimizar la paginación con navegación bidireccional e indicadores de carga
export async function renderBlogs(options = {}) {
    const { 
        loadPrevious = false,
        reset = false
    } = options;
    
    const container = document.getElementById('blogs-container');
    const loadMoreBtn = document.getElementById('load-more-blogs');
    const endOfBlogsMsg = document.getElementById('end-of-blogs');
    
    // Si estamos cargando, evita llamadas duplicadas
    if (paginationState.isLoading) {
        console.log("Carga en progreso, evitando petición duplicada");
        return;
    }
    
    paginationState.isLoading = true;

    // Si reset es true, reiniciamos la paginación
    if (reset) {
        container.innerHTML = '<div class="loading"></div>';
        paginationState = {
            isLoading: true,
            currentLastVisible: null,
            currentFirstVisible: null,
            isFirstPage: true,
            isLastPage: false
        };
        
        // Actualizar el texto circular para el nuevo elemento de carga
        refreshCircularText();
    }

    // Mostrar indicador de carga solo si no existe ya uno
    const existingLoading = container.querySelector('.loading-indicator, .loading');
    if (!existingLoading) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerText = 'Cargando...';
        container.appendChild(loadingIndicator);
    }

    try {
        // Determinar qué parámetros pasar según la navegación solicitada
        const fetchOptions = loadPrevious 
            ? { firstVisible: paginationState.currentFirstVisible, loadPrevious: true }
            : { lastVisible: paginationState.currentLastVisible };

        // Obtener blogs paginados
        const { 
            blogs, 
            firstVisible, 
            lastVisible, 
            isFirstPage, 
            isLastPage 
        } = await fetchBlogs(fetchOptions);

        // Actualizar estado de paginación
        paginationState = {
            ...paginationState,
            isLoading: false,
            currentFirstVisible: firstVisible,
            currentLastVisible: lastVisible,
            isFirstPage,
            isLastPage
        };

        // Eliminar TODOS los indicadores de carga
        const loadingElements = container.querySelectorAll('.loading-indicator, .loading');
        loadingElements.forEach(el => {
            if (container.contains(el)) {
                container.removeChild(el);
            }
        });

        if (!blogs.length) {
            if (reset) {
                container.innerHTML = '<div class="no-results">No se encontraron blogs</div>';
                loadMoreBtn.style.display = 'none';
                endOfBlogsMsg.style.display = 'none';
            }
            return;
        }

        // Limpiar contenedor si estamos reseteando o navegando hacia atrás
        if (reset || loadPrevious) {
            container.innerHTML = '';
        }

        // Renderizar blogs
        const newBlogsHTML = blogs.map(blog => `
            <div class="blog-card" data-id="${blog.id}">
                <div class="blog-image">
                    <img src="${blog.image_path || './asset/img/logo_gris.jpeg'}" alt="${blog.title}" />
                </div>
                <div class="blog-info">
                    <h3 class="blog-post-title">${blog.title}</h3>
                    <p class="blog-excerpt">${blog.excerpt}</p>
                    <a href="#" class="read-more" data-id="${blog.id}">Leer más</a>
                </div>
            </div>
        `).join('');

        // Insertar al principio si es navegación hacia atrás, al final si es hacia adelante
        if (loadPrevious) {
            container.insertAdjacentHTML('afterbegin', newBlogsHTML);
            // Desplazar hacia arriba para mostrar los nuevos elementos
            container.firstElementChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            container.insertAdjacentHTML('beforeend', newBlogsHTML);
        }

        // Agregar listeners a los nuevos enlaces "Leer más"
        addReadMoreListeners(container, blogs);

        // Actualizar visibilidad del botón y mensaje
        updatePaginationControls(loadMoreBtn, endOfBlogsMsg);
        
    } catch (error) {
        console.error('Error al cargar los blogs:', error);
        
        // Eliminar TODOS los indicadores de carga incluso en caso de error
        const loadingElements = container.querySelectorAll('.loading-indicator, .loading');
        loadingElements.forEach(el => {
            if (container.contains(el)) {
                container.removeChild(el);
            }
        });
        
        if (reset) {
            container.innerHTML = '<div class="error-message">Error al cargar los blogs. Inténtalo de nuevo más tarde.</div>';
        } else {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = 'Error al cargar más blogs. Inténtalo de nuevo.';
            container.appendChild(errorMsg);
            
            // Auto-eliminar mensaje de error después de 3 segundos
            setTimeout(() => {
                if (container.contains(errorMsg)) {
                    container.removeChild(errorMsg);
                }
            }, 3000);
        }
        
        // Restaurar estado de carga
        paginationState.isLoading = false;
    }
}

// Actualizar controles de paginación
function updatePaginationControls(loadMoreBtn, endOfBlogsMsg) {
    if (!loadMoreBtn || !endOfBlogsMsg) return;

    // Obtener el botón de página anterior
    const prevPageBtn = document.getElementById('prev-page-blogs');
    
    // Manejar visibilidad del botón "Página Anterior"
    if (prevPageBtn) {
        if (paginationState.isFirstPage) {
            prevPageBtn.style.display = 'none';
        } else {
            prevPageBtn.style.display = 'inline-block';
            
            // Remover listeners anteriores para evitar duplicados
            const newPrevBtn = prevPageBtn.cloneNode(true);
            prevPageBtn.parentNode.replaceChild(newPrevBtn, prevPageBtn);
            
            // Agregar nuevo listener para navegar a la página anterior
            newPrevBtn.onclick = () => renderBlogs({ loadPrevious: true });
        }
    }
    
    // Manejar visibilidad del botón "Cargar Más"
    if (paginationState.isLastPage) {
        loadMoreBtn.style.display = 'none';
        endOfBlogsMsg.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'inline-block';
        endOfBlogsMsg.style.display = 'none';
        
        // Remover listeners anteriores para evitar duplicados
        const newBtn = loadMoreBtn.cloneNode(true);
        loadMoreBtn.parentNode.replaceChild(newBtn, loadMoreBtn);
        
        // Agregar nuevo listener para cargar más blogs
        newBtn.onclick = () => renderBlogs({ loadPrevious: false });
    }
}

// Función auxiliar para agregar event listeners a los enlaces "Leer más"
function addReadMoreListeners(container, blogs) {
    container.querySelectorAll('.read-more, .blog-card').forEach(link => {
        // Verificar si el elemento ya tiene un listener para evitar duplicados
        // Remover listener existente si lo hubiera (usando cloneNode)
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        // Agregar nuevo listener
        newLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const blogId = newLink.dataset.id;
            
            // Mostrar indicador de carga
            const modal = document.getElementById('generic-modal'); // Actualizado para usar el modal genérico
            const modalBody = document.getElementById('modal-body');
            
            // Verificar que los elementos existan antes de usarlos
            if (!modal || !modalBody) {
                console.error("Elementos del modal no encontrados en el DOM");
                return;
            }
            
            // Mostrar el modal con un indicador de carga
            modal.style.display = 'flex';
            modalBody.innerHTML = '<div class="loading"></div>';
            // Marcar modal para estilos específicos de blog
            modal.classList.add('blog-modal');
            setTimeout(() => {
                modal.classList.add('visible');
                // Actualizar el texto circular para el nuevo elemento de carga
                refreshCircularText();
            }, 10);
            
            try {
                // Buscar primero el blog en la lista de blogs ya cargados (para eficiencia)
                let blog = blogs.find(b => b.id === blogId);
                
                // Si no tiene contenido completo o no se encontró, obtenerlo de la base de datos
                if (!blog || !blog.content) {
                    blog = await fetchBlogById(blogId);
                }
                
                if (blog) {
                    showBlogDetail(blog);
                } else {
                    throw new Error(`Blog con ID ${blogId} no encontrado`);
                }
            } catch (error) {
                console.error(error);
                if (modalBody) {
                    modalBody.innerHTML = `
                        <div class="error-message">
                            <h3>Error al cargar el blog</h3>
                            <p>Lo sentimos, no pudimos cargar el contenido del blog. Por favor, inténtalo de nuevo más tarde.</p>
                        </div>
                    `;
                }
            }
        });
    });
}

// Mostrar detalle del blog
export function showBlogDetail(blog) {
  const modal = document.getElementById('generic-modal');
  const modalBody = document.getElementById('modal-body');
  const closeModalX = document.getElementById('close-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  
  if (!modal || !modalBody || !closeModalX || !closeModalBtn) {
    console.error("Elementos del modal no encontrados en el DOM.");
    return;
  }
  
  // Verificar que blog existe antes de acceder a sus propiedades
  if (!blog) {
    console.error("Se intentó mostrar un blog que no existe");
    return;
  }
  
  // Obtener el contenido del disclaimer principal
  const mainDisclaimer = document.querySelector('.disclaimer-content span');
  const disclaimerText = mainDisclaimer ? mainDisclaimer.innerHTML : 
      '<p>Información solo con fines informativos. Consulta con un profesional de la salud antes de cualquier uso.</p>';
  
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
    <img src="${blog.image_path || './asset/img/logo_gris.jpeg'}" alt="${blog.title}" class="blog-detail-image" />
    <div class="blog-content">
        ${blog.content || 'Contenido no disponible'}
    </div>
  `;
  
  // Función para cerrar el modal
  const close = () => {
    modal.classList.remove('visible');
    // Limpiar marcador de estilo específico para blogs
    modal.classList.remove('blog-modal');
    // Esperar a que termine la animación antes de ocultar completamente
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300); // Debe coincidir con la duración de la transición en CSS
    
    // Remover los event listeners para evitar duplicados
    closeModalX.removeEventListener('click', close);
    closeModalBtn.removeEventListener('click', close);
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
  
  if (disclaimerBtn && disclaimerContainer) {
    disclaimerBtn.addEventListener('click', () => {
        disclaimerContainer.style.display = 
            disclaimerContainer.style.display === 'none' ? 'block' : 'none';
    });
  }
  
  // Mostrar el modal y agregar clase visible para la animación
  modal.style.display = 'flex';
    // Marcar modal para estilos específicos de blog
    modal.classList.add('blog-modal');
  // Usar setTimeout para asegurar que se aplique la transición
  setTimeout(() => {
    modal.classList.add('visible');
  }, 10);
  
  // Agregar event listeners para cerrar
  closeModalX.addEventListener('click', close);
  closeModalBtn.addEventListener('click', close);
  window.addEventListener('click', closeOutside);
}