import { getDb } from "./firebase-config";
// Renderizar productos en la página
export function renderProducts(products, blogs) { // Aceptar blogs como argumento
    const container = document.getElementById('products-container');
    
    if (!products || !products.length) { 
      container.innerHTML = '<div class="no-results">No se encontraron productos</div>';
      return;
    }
    
    // Extraer categorías únicas de los productos y asegurarnos de que no sean null o undefined
    const categories = [...new Set(products
      .map(product => product.category || product.category_name)
      .filter(category => category) // Filtrar categorías que sean null, undefined o vacías
    )];
    
    console.log('Categorías disponibles:', categories); // Debug
    console.log('Productos:', products); // Debug
    
    // Crear filtro de categorías en la parte superior
    const categoryFilterHtml = `
      <div class="category-filters">
        <div class="category-filter-item active" data-category="all">
          Todas
        </div>
        ${categories.map(category => `
          <div class="category-filter-item" data-category="${category}">
            ${category}
          </div>
        `).join('')}
      </div>
    `;
    
    // Renderizar productos con el filtro de categorías arriba
    container.innerHTML = `
      ${categoryFilterHtml}
      <div class="product-items">
        ${products.map(product => {
          // Usar category o category_name, lo que esté disponible
          const category = product.category || product.category_name || 'Sin categoría';
          return `
            <div class="product-card" data-id="${product.id}" data-category="${category}">
              <div class="product-image">
                <img src="./${product.image_path || 'asset/img/logo_gris.jpeg'}" alt="${product.title}" />
                <div class="product-tag">${category}</div> 
              </div>
              <div class="product-info">
                <h3>${product.title}</h3>
                <!-- <p class="product-price">$${product.price ? product.price.toFixed(2) : 'N/A'}</p>-->
          
                <div class="product-tags">
                  ${product.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || ''}
                </div>
              
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    // Agregar event listeners a los productos
    container.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => {
        const productId = card.dataset.id;
        const product = products.find(p => p.id === productId);
        if (product) {
          // Pasar la lista de blogs a showProductDetail
          showProductDetail(product, blogs); 
        } else {
          console.error("Producto no encontrado con ID:", productId);
        }
      });
    });

    // Agregar event listeners para los filtros de categoría
    container.querySelectorAll('.category-filter-item').forEach(filterItem => {
      filterItem.addEventListener('click', function() {
        console.log('Filtro clickeado:', this.dataset.category); // Debug
        
        // Quitar clase activa de todos los filtros
        container.querySelectorAll('.category-filter-item').forEach(item => {
          item.classList.remove('active');
        });
        
        // Añadir clase activa al filtro seleccionado
        this.classList.add('active');
        
        // Obtener la categoría seleccionada
        const selectedCategory = this.dataset.category;
        
        // Filtrar productos
        if (selectedCategory === 'all') {
          // Mostrar todos los productos
          container.querySelectorAll('.product-card').forEach(card => {
            card.style.display = '';
          });
        } else {
          // Mostrar solo productos de la categoría seleccionada
          container.querySelectorAll('.product-card').forEach(card => {
            if (card.dataset.category === selectedCategory) {
              card.style.display = '';
            } else {
              card.style.display = 'none';
            }
          });
        }
      });
    });
  }
  // Restaurar showProductDetail: encapsular el contenido del modal en una función exportada
    export function showProductDetail(product, blogs) {
      const modal = document.getElementById('generic-modal');
      const modalBody = document.getElementById('modal-body');
      const closeModalX = document.getElementById('close-modal');
      const closeModalBtn = document.getElementById('close-modal-btn');

      if (!modal || !modalBody || !closeModalX || !closeModalBtn) {
        console.error('Elementos del modal no encontrados en el DOM.');
        return;
      }

      const mainDisclaimer = document.querySelector('.disclaimer-content-hierbas span');
      const disclaimerText = mainDisclaimer ? mainDisclaimer.innerHTML : 
          'La información proporcionada en este sitio web es solo para fines informativos y educativos. No pretende diagnosticar, tratar, curar o prevenir ninguna enfermedad. Consulte siempre con un profesional de la salud calificado antes de usar cualquier producto o tratamiento.';

      // Mostrar promedio de estrellas justo debajo del título para no distraer
      const productRatingSummary = getProductRating(product.id);
      const averageStarsInline = createStarDisplay(productRatingSummary.average);

      // Construir HTML de blogs relacionados si existen
      let relatedBlogsHtml = '';
      if (product.related_blogs && product.related_blogs.length) {
        relatedBlogsHtml = `
          <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
            <h4>Info de las Hierbas:</h4>
            <ul class="related-blogs-list">
              ${product.related_blogs.map(blogRef => {
              // Intentar encontrar el blog completo por ID para asegurar que existe
              const relatedBlog = blogs.find(b => b.id === (blogRef.id || blogRef)); // Manejar si es objeto o solo ID
              const blogTitle = relatedBlog ? relatedBlog.title : (blogRef.title || 'Blog no encontrado'); // Usar título de referencia o del blog encontrado
              const blogId = relatedBlog ? relatedBlog.id : (blogRef.id || blogRef);
              // Solo crear enlace si se encontró el blog o se tiene un ID
              if (relatedBlog || blogRef.id || typeof blogRef === 'string') {
                 return `<li><a href="#" class="related-blog-link" data-blog-id="${blogId}">${blogTitle}</a></li>`;
              }
              return `<li>${blogTitle} (ID: ${blogId})</li>`; // Mostrar sin enlace si no se puede resolver
            }).join('')}
            </ul>
          </div>
        `;
      }

      modalBody.innerHTML = `
        <div class="modal-product-header">
  <div class="product-image">
  <img src="${product.image_path || './asset/img/logo_gris.jpeg'}" alt="${product.title}" loading="lazy" decoding="async" width="324" height="200" />
  </div> 
          <h2>${product.title}</h2>
          <div class="modal-average-rating">
            <div class="average-stars-inline">${averageStarsInline}</div>
            <div class="average-text-inline">
              <span class="average-score-inline">${productRatingSummary.average}</span>/5
              <span class="rating-count-inline"> · ${productRatingSummary.count} ${productRatingSummary.count === 1 ? 'reseña' : 'reseñas'}</span>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-share" data-product-id="${product.id}">
              <i class="bi bi-share"></i> Compartir
            </button>
          </div>
        </div> 
        <p>${product.description || 'Descripción no disponible.'}</p>
        <button class="disclaimer-btn" title="Declinación de responsabilidad">
          <i class="bi bi-exclamation-triangle"></i> Descargo de responsabilidad
        </button>
        <div class="modal-disclaimer-container" style="display: none;">
          ${disclaimerText}
        </div>
        ${relatedBlogsHtml}
        ${createRatingSection(product.id)}
        <div id="blog-content-in-product" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; display: none;">
          <h4>Detalle de la Hierba:</h4>
          <div id="blog-content-container"></div>
          <button class="btn" id="close-blog-content">Cerrar detalle</button>
        </div>
      `;
    // Agregar evento para el declinador de responsabilidad
    const disclaimerBtn = modalBody.querySelector('.disclaimer-btn');
    const disclaimerContainer = modalBody.querySelector('.modal-disclaimer-container');
    
    if (disclaimerBtn && disclaimerContainer) {
      disclaimerBtn.addEventListener('click', () => {
          disclaimerContainer.style.display = 
              disclaimerContainer.style.display === 'none' ? 'block' : 'none';
      });
    }
      // Agregar evento para el botón de compartir
    const shareBtn = modalBody.querySelector('.btn-share');
    if (shareBtn) {
      // Guardar el producto actual en una variable global para poder accederlo al volver
      window._currentSharedProduct = product;
      
      shareBtn.addEventListener('click', () => {
        shareProduct(product);
      });
    }
  
    // Función para cerrar el modal
    const close = () => {
      modal.classList.remove('visible');
      // Esperar a que termine la animación antes de ocultar completamente
      setTimeout(() => {
        modal.style.display = 'none';
        
        // Limpiar listeners de blogs relacionados al cerrar
        modalBody.querySelectorAll('.related-blog-link').forEach(link => {
          // Clonar y reemplazar para remover listeners anónimos previos si existen
          link.replaceWith(link.cloneNode(true)); 
        });
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
  
    // Añadir listeners para los enlaces de blogs relacionados DESPUÉS de setear innerHTML
    modalBody.querySelectorAll('.related-blog-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const blogId = link.dataset.blogId;
        const relatedBlog = blogs.find(b => b.id === blogId);

        const blogContentDiv = document.getElementById('blog-content-in-product');
        const blogContentContainer = document.getElementById('blog-content-container');

        if (!blogContentDiv || !blogContentContainer) {
          console.error('Elementos para mostrar blog no encontrados en el DOM');
          return;
        }

        // Rellenar contenido
        if (relatedBlog) {
          blogContentContainer.innerHTML = `
            <div class="blog-card">
              <h2>${relatedBlog.title}</h2>
              <p>${relatedBlog.excerpt || relatedBlog.content || 'Contenido no disponible'}</p>
            </div>
          `;
        } else {
          blogContentContainer.innerHTML = `
            <div class="blog-card">
              <div class="no-results">No se pudo encontrar el detalle del blog solicitado</div>
            </div>
          `;
        }

        // Crear/backdrop si no existe. Intentar insertarlo antes del contenedor flotante
        let backdrop = modal.querySelector('.blog-floating-backdrop');
        if (!backdrop) {
          backdrop = document.createElement('div');
          backdrop.className = 'blog-floating-backdrop';
          // blogContentDiv puede no ser hijo directo de `modal` -> usar su parentNode
          const refParent = blogContentDiv.parentNode;
          try {
            if (refParent && refParent.contains(blogContentDiv) && modal.contains(refParent)) {
              refParent.insertBefore(backdrop, blogContentDiv);
            } else {
              // fallback seguro
              modal.appendChild(backdrop);
            }
          } catch (err) {
            // En caso raro de que insertBefore falle, usar appendChild como respaldo
            modal.appendChild(backdrop);
            console.warn('Fallo insertBefore para backdrop, se usó appendChild como fallback', err);
          }
        }

        // Mostrar backdrop y tarjeta flotante
        backdrop.classList.add('visible');
        blogContentDiv.style.display = 'block';
        // Forzar reflow para activar la transición
        void blogContentDiv.offsetWidth;
        blogContentDiv.classList.add('visible');

        // Cerrar al clicar backdrop
        const handleBackdropClick = (ev) => {
          if (ev.target === backdrop) {
            closeBlogFloating();
          }
        };
        backdrop.addEventListener('click', handleBackdropClick);

        // Manejar botón cerrar dentro de la tarjeta
        const closeButton = document.getElementById('close-blog-content');
        if (closeButton) {
          // Reemplazar para evitar listeners duplicados
          const newClose = closeButton.cloneNode(true);
          closeButton.parentNode.replaceChild(newClose, closeButton);
          newClose.addEventListener('click', closeBlogFloating);
        }

        // Función para cerrar la tarjeta flotante
        function closeBlogFloating() {
          blogContentDiv.classList.remove('visible');
          backdrop.classList.remove('visible');
          // Esperar transición antes de ocultar
          setTimeout(() => {
            blogContentDiv.style.display = 'none';
            // remover backdrop para limpieza
            if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
          }, 220);
          backdrop.removeEventListener('click', handleBackdropClick);
        }
      });
    });
    // Mostrar el modal con animación
    modal.style.display = 'flex';
    // Usar setTimeout para asegurar que se aplique la transición
    setTimeout(() => {
      modal.classList.add('visible');
    }, 10);

    // Inicializar el sistema de calificación con estrellas
    const ratingSection = modalBody.querySelector('.rating-section');
    if (ratingSection) {
        initializeStarRating(ratingSection);
    // Actualizar promedio real desde Firestore al abrir el modal
    fetchProductRating(product.id).catch(console.error);
    }
  
    // Agregar listeners para cerrar
    closeModalX.addEventListener('click', close);
    closeModalBtn.addEventListener('click', close);
    window.addEventListener('click', closeOutside);
  }// Función para compartir producto
  function shareProduct(product) {
    const shareData = {
      title: product.title,
      text: `¡Mira esta mezcla de La que tomo Yo!: ${product.title}`,
      url: `${window.location.origin}${window.location.pathname}?mezcla=${product.id}`
    };

    // Verificar si el dispositivo soporta la API Web Share
    if (!navigator.share) {
      // API de Web Share (dispositivos móviles)
      navigator.share(shareData)
        .catch(error => {
          console.log('Error al compartir:', error);
          // Si hay un error con la API Web Share, mostrar una notificación o fallback
          showShareFallback(shareData);
        });
    } else {
      // Fallback para navegadores de escritorio
      showShareFallback(shareData);
    }
  }
  // Función de fallback para compartir en dispositivos que no soporten la API Web Share
  function showShareFallback(shareData) {
    // Crear un menú de compartir personalizado con opciones comunes
    const modal = document.getElementById('generic-modal');
    const modalBody = document.getElementById('modal-body');
    
    // Guardar el producto actual del modal
    const productId = shareData.url.split('mezcla=')[1];
    
    // Intentar obtener el objeto producto completo de varias formas
    let currentProduct;
    
    // 1. Buscar en los productos renderizados en el DOM
    const productCard = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (productCard) {
      // Crear un objeto básico si encontramos la tarjeta
      currentProduct = { id: productId, title: shareData.title };
    } 
    // 2. Si no se encuentra, crear un objeto básico con la información que tenemos
    else {
      currentProduct = { id: productId, title: shareData.title };
    }
    
    // Guardar una referencia global al producto para poder usarla al volver
    window._currentSharedProduct = currentProduct;
    
    // Guardar el contenido actual del modal para restaurarlo después
    const originalContent = modalBody.innerHTML;
    
    // Crear el contenido del menú de compartir
    modalBody.innerHTML = `
      <div class="share-menu">
        <h3>Compartir Mezcla</h3>
        <p>Elige una opción para compartir:</p>
        <div class="share-options">
          <button class="share-option" data-platform="facebook">
            <i class="bi bi-facebook"></i>
            Facebook
          </button>
          <button class="share-option" data-platform="whatsapp">
            <i class="bi bi-whatsapp"></i>
            WhatsApp
          </button>
          <button class="share-option" data-platform="twitter">
            <i class="bi bi-twitter-x"></i>
            X
          </button>
          <button class="share-option" data-platform="telegram">
            <i class="bi bi-telegram"></i>
            Telegram
          </button>
          <button class="share-option" data-platform="copy">
            <i class="bi bi-clipboard"></i>
            Copiar enlace
          </button>
        </div>
        <div class="copy-feedback" style="display: none;">
          ¡Enlace copiado al portapapeles!
        </div>
        <input type="hidden" id="current-product-id" value="${productId || ''}">
      </div>
    `;
    
    // Añadir event listeners a los botones de compartir
    const shareOptions = modalBody.querySelectorAll('.share-option');
    shareOptions.forEach(option => {
      option.addEventListener('click', () => {
        const platform = option.dataset.platform;
        let shareUrl;
        
        switch(platform) {
          case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`;
            window.open(shareUrl, '_blank', 'width=600,height=400');
            break;
          case 'whatsapp':
            shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`;
            window.open(shareUrl, '_blank');
            break;
          case 'twitter':
            shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
            window.open(shareUrl, '_blank', 'width=600,height=400');
            break;
          case 'telegram':
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.text)}`;
            window.open(shareUrl, '_blank');
            break;          case 'copy':
            // Copiar al portapapeles usando una solución más compatible
            try {
              // Crear un elemento de texto temporal
              const textArea = document.createElement('textarea');
              textArea.value = shareData.url;
              textArea.style.position = 'fixed'; // Evita afectar el diseño
              textArea.style.opacity = '0';
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();

              // Ejecutar el comando de copia
              const successful = document.execCommand('copy');
              
              // Mostrar feedback
              const feedback = modalBody.querySelector('.copy-feedback');
              if (feedback) {
                feedback.style.display = 'block';
                setTimeout(() => {
                  feedback.style.display = 'none';
                }, 2000);
              }
              
              // Limpiar
              document.body.removeChild(textArea);
            } catch(err) {
              console.error('Error al copiar: ', err);
              // Intentar con la API moderna como respaldo
              navigator.clipboard.writeText(shareData.url)
                .then(() => {
                  const feedback = modalBody.querySelector('.copy-feedback');
                  if (feedback) {
                    feedback.style.display = 'block';
                    setTimeout(() => {
                      feedback.style.display = 'none';
                    }, 2000);
                  }
                })
                .catch(clipErr => {
                  console.error('Error al copiar con clipboard API: ', clipErr);
                  alert('No se pudo copiar el enlace. Por favor, cópialo manualmente.');
                });
            }
            break;
        }
      });
    });

   
    
    // Guardar el evento onclick original del botón de cerrar
    const closeModalX = document.getElementById('close-modal');
    const originalXClose = closeModalX.onclick;
    
    // Crear un nuevo botón de volver específicamente para el menú de compartir
    const shareMenuBackBtn = document.createElement('button');
    shareMenuBackBtn.className = 'btn btn-back';
    shareMenuBackBtn.textContent = 'Volver';
    shareMenuBackBtn.style.marginTop = '20px';
    
    // Añadir el botón de volver al menú de compartir
    const shareMenu = modalBody.querySelector('.share-menu');
    if (shareMenu) {
      shareMenu.appendChild(shareMenuBackBtn);
    }
    
    const handleBackClick = () => {
      // Restaurar contenido original del modal
      modalBody.innerHTML = originalContent;
    
      
      // Restaurar los event listeners de los elementos del contenido original
      
      // 1. Restaurar listener para el disclaimer
      const disclaimerBtn = modalBody.querySelector('.disclaimer-btn');
      const disclaimerContainer = modalBody.querySelector('.modal-disclaimer-container');
      if (disclaimerBtn && disclaimerContainer) {
        disclaimerBtn.addEventListener('click', () => {
          disclaimerContainer.style.display = 
              disclaimerContainer.style.display === 'none' ? 'block' : 'none';
        });
      }
        // 2. Restaurar listener para el botón de compartir
      const shareBtn = modalBody.querySelector('.btn-share');
      if (shareBtn) {
        shareBtn.addEventListener('click', () => {
          // Usar el producto guardado en la variable global para compartir
          const productToShare = window._currentSharedProduct;
          shareProduct(productToShare);
        });
      }
      
      // 3. Restaurar listeners para los blogs relacionados
      modalBody.querySelectorAll('.related-blog-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const blogId = link.dataset.blogId;
          const relatedBlog = blogs.find(b => b.id === blogId);
          if (relatedBlog) {
            // Mostrar el blog...
            const blogContentDiv = document.getElementById('blog-content-in-product');
            const blogContentContainer = document.getElementById('blog-content-container');
            
            if (blogContentDiv && blogContentContainer) {
              blogContentContainer.innerHTML = `
                <h3>${relatedBlog.title}</h3>
                <p>${relatedBlog.excerpt || 'Contenido no disponible'}</p>
              `;
              blogContentDiv.style.display = 'block';
              blogContentDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
              
              const closeButton = document.getElementById('close-blog-content');
              if (closeButton) {
                const newCloseButton = closeButton.cloneNode(true);
                closeButton.parentNode.replaceChild(newCloseButton, closeButton);
                
                newCloseButton.addEventListener('click', () => {
                  blogContentDiv.style.display = 'none';
                });
              }
            }
          }
        });
      });
    };
    
    // Asignar evento al botón de volver del menú de compartir
    shareMenuBackBtn.addEventListener('click', handleBackClick);
    
  
  }
// Función auxiliar para verificar si el elemento del carrusel existe
function waitForCarouselElement() {
    return new Promise((resolve) => {
        const checkElement = () => {
            const container = document.getElementById('herbs-carousel-container');
            if (container) {
                resolve(container);
            } else {
                setTimeout(checkElement, 100);
            }
        };
        checkElement();
    });
}

// Función mejorada para renderizar el carrusel de hierbas
export async function renderHerbsCarousel(products) {
    // Esperar a que el elemento del carrusel esté disponible
    const container = await waitForCarouselElement();
    const track = container.querySelector('.carousel-track');
    const indicatorsContainer = container.parentElement.querySelector('.carousel-indicators');
    
    if (!products || !products.length) {
        track.innerHTML = '<div class="carousel-empty"><i class="bi bi-leaf"></i><p>No hay hierbas disponibles</p></div>';
        if (indicatorsContainer) {
            indicatorsContainer.innerHTML = '';
        }
        return;
    }

    // Limpiar contenido anterior
    track.innerHTML = '';
    if (indicatorsContainer) {
        indicatorsContainer.innerHTML = '';
    }

    // Crear items del carrusel
    const carouselItems = products.map(product => {
        const category = product.category || product.category_name || 'Sin categoría';
        const description = product.description || product.short_description || 'Descubre las propiedades de esta hierba...';
        
        return `
            <div class="carousel-item" data-id="${product.id}">
                <div class="carousel-item-image">
                    <img src="./${product.image_path || 'asset/img/logo_gris.jpeg'}" alt="${product.title}" />
                    <div class="carousel-item-tag">${category}</div>
                </div>
                <div class="carousel-item-info">
                    <h3>${product.title}</h3>
                    <div class="carousel-item-description">${description}</div>
                    <div class="carousel-item-tags">
                        ${product.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    track.innerHTML = carouselItems;

    // Crear indicadores
    const indicators = products.map((_, index) => 
        `<button class="carousel-indicator ${index === 0 ? 'active' : ''}" data-slide="${index}"></button>`
    ).join('');
    
    indicatorsContainer.innerHTML = indicators;

    // Inicializar funcionalidad del carrusel
    initializeCarousel(products.length);    // Agregar event listeners para abrir modal
    const carouselItemElements = track.querySelectorAll('.carousel-item');
    carouselItemElements.forEach(item => {
        item.addEventListener('click', () => {
            const productId = item.dataset.id;
            const product = products.find(p => p.id === productId);
            if (product) {
                showProductDetail(product, window.allBlogs);
            }
        });
    });
}

// Función para inicializar la funcionalidad del carrusel
function initializeCarousel(totalItems) {
    const track = document.querySelector('#herbs-carousel-container .carousel-track');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    const indicators = document.querySelectorAll('.carousel-indicator');
      let currentSlide = 0;
    let visibleItems = getVisibleItems();
    let maxSlides = Math.max(0, totalItems - visibleItems);

    function getVisibleItems() {
        const containerWidth = track.parentElement.offsetWidth;
        
        // Lógica responsive para determinar cuántos items mostrar
        if (containerWidth <= 480) {
            return 1; // Móviles pequeños: 1 item
        } else if (containerWidth <= 768) {
            return 1; // Tablets: 1 item
        } else if (containerWidth <= 1024) {
            return 2; // Tablets grandes: 2 items
        } else {
            return 3; // Desktop: 3 items
        }
    }

    function getItemWidth() {
        const containerWidth = track.parentElement.offsetWidth;
        const items = getVisibleItems();
        
        if (containerWidth <= 768) {
            // En móvil, el item ocupa casi todo el ancho
            return containerWidth - 40; // Resta el padding lateral
        } else {
            // En desktop, usar el ancho fijo + gap
            const gap = 24;
            return (containerWidth - (gap * (items - 1))) / items;
        }
    }

    function updateCarousel() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // En móvil, usar percentage para moverse de elemento en elemento
            const translateX = -(currentSlide * 100);
            track.style.transform = `translateX(${translateX}%)`;
        } else {
            // En desktop, usar el ancho calculado
            const itemWidth = getItemWidth();
            const gap = 24;
            const totalWidth = itemWidth + gap;
            const translateX = -(currentSlide * totalWidth);
            track.style.transform = `translateX(${translateX}px)`;
        }
        
        // Actualizar indicadores
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', 
                index >= currentSlide && index < currentSlide + visibleItems
            );
        });

        // Actualizar botones
        prevBtn.disabled = currentSlide === 0;
        nextBtn.disabled = currentSlide >= maxSlides;
    }

    function nextSlide() {
        if (currentSlide < maxSlides) {
            currentSlide++;
            updateCarousel();
        }
    }

    function prevSlide() {
        if (currentSlide > 0) {
            currentSlide--;
            updateCarousel();
        }
    }

    function goToSlide(slideIndex) {
        currentSlide = Math.min(slideIndex, maxSlides);
        updateCarousel();
    }

    // Event listeners
    nextBtn.addEventListener('click', nextSlide);
    prevBtn.addEventListener('click', prevSlide);

    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => goToSlide(index));
    });

    // Auto-play del carrusel (opcional)
    let autoplayInterval;
    
    function startAutoplay() {
        autoplayInterval = setInterval(() => {
            if (currentSlide >= maxSlides) {
                currentSlide = 0;
            } else {
                currentSlide++;
            }
            updateCarousel();
        }, 5000); // Cambiar cada 5 segundos
    }

    function stopAutoplay() {
        clearInterval(autoplayInterval);
    }

    // Iniciar autoplay y detenerlo al interactuar
    startAutoplay();
    
    const carouselWrapper = document.querySelector('.carousel-wrapper');
    carouselWrapper.addEventListener('mouseenter', stopAutoplay);
    carouselWrapper.addEventListener('mouseleave', startAutoplay);    // Responsive: actualizar al cambiar el tamaño de ventana
    window.addEventListener('resize', () => {
        const newVisibleItems = getVisibleItems();
        const newMaxSlides = Math.max(0, totalItems - newVisibleItems);
        
        // Actualizar variables globales
        visibleItems = newVisibleItems;
        maxSlides = newMaxSlides;
        
        // Ajustar currentSlide si es necesario
        if (currentSlide > maxSlides) {
            currentSlide = maxSlides;
        }
        
        updateCarousel();
    });

    // Inicializar estado
    updateCarousel();

    // Soporte para touch/swipe en móviles
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        stopAutoplay();
    });

    track.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        e.preventDefault();
    });

    track.addEventListener('touchend', () => {
        if (!isDragging) return;
        
        const diffX = startX - currentX;
        const threshold = 50;

        if (diffX > threshold) {
            nextSlide();
        } else if (diffX < -threshold) {
            prevSlide();
        }

        isDragging = false;
        startAutoplay();
    });

    // Soporte para navegación con teclado
    document.addEventListener('keydown', (e) => {
        const carouselWrapper = document.querySelector('.carousel-wrapper');
        if (!carouselWrapper || !carouselWrapper.matches(':hover')) return;
        
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (e.key === 'ArrowLeft') {
                prevSlide();
            } else {
                nextSlide();
            }
            stopAutoplay();
            setTimeout(startAutoplay, 3000); // Reanudar autoplay después de 3 segundos
        }
    });

    // Mejorar accesibilidad con indicadores ARIA
    prevBtn.setAttribute('aria-label', 'Producto anterior');
    nextBtn.setAttribute('aria-label', 'Producto siguiente');
      indicators.forEach((indicator, index) => {
        indicator.setAttribute('aria-label', `Ir al producto ${index + 1}`);
    });

  
}

// Ajustes específicos para móvil
    function adjustForMobile() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Reducir el threshold para swipe en móvil
            const threshold = 30;
            
            // Mejorar la detección de swipe
          //  track.style.touchAction = 'pan-y pinch-zoom';
            
            // Asegurar que los indicadores sean más visibles en móvil
            const indicators = document.querySelectorAll('.carousel-indicator');
            indicators.forEach(indicator => {
                indicator.style.width = '14px';
                indicator.style.height = '14px';
            });
        }
    }

    // Llamar al ajuste inicial
    adjustForMobile();
    
    // Llamar al ajuste cuando cambie el tamaño
    window.addEventListener('resize', adjustForMobile);

// Sistema de calificación con estrellas
function createRatingSection(productId) {
    const productRating = getProductRating(productId);
    const averageStars = createStarDisplay(productRating.average);
    
  return `
    <div class="rating-section">
  <!-- Formulario para nueva calificación (ordenado: estrellas → nombre opcional → comentario → acciones) -->
      <div class="new-rating-form">
        <h4 class="rating-title">¿Qué te pareció este producto?</h4>
        <div class="rating-help">
          <small>
            <i class="bi bi-info-circle"></i>
            La puntuación con estrellas es voluntaria, pero es el mínimo necesario para dejar una reseña.
          </small>
        </div>
        <!-- Estrellas primero: es lo principal (clasificar) -->
        <div class="star-rating" data-product-id="${productId}">
          ${[1, 2, 3, 4, 5].map(i => 
            `<span class="star" data-rating="${i}">★</span>`
          ).join('')}
        </div>
        <!-- Nombre opcional: dejar claro que es opcional para preservar anonimato -->
        <input class="rating-name" type="text" placeholder="Tu nombre (opcional)" maxlength="50" />
        <!-- Comentario: opcional -->
        <textarea 
          class="rating-comment" 
          placeholder="Comparte tu experiencia con este producto (opcional)..."
          maxlength="500"
        ></textarea>
        <div class="character-count">0/500</div>
        <div class="rating-actions">
          <button class="btn-rating cancel">
            <i class="bi bi-x-circle"></i>
            Cancelar
          </button>
          <button class="btn-rating save" disabled>
            <i class="bi bi-star-fill"></i>
            Guardar Calificación
          </button>
        </div>
        <div class="rating-success">
          <i class="bi bi-check-circle-fill"></i>
          ¡Gracias por tu calificación! Tu opinión nos ayuda a mejorar.
        </div>
      </div>

      <!-- Comentarios anteriores -->
      <div class="previous-ratings">
        <div class="ratings-header">
          <h4>Reseñas</h4>
          <button class="btn-toggle-comments" data-product-id="${productId}">
            <i class="bi bi-chevron-down"></i>
            Ver reseñas
          </button>
        </div>
        <div class="ratings-list" style="display: none;">
          <!-- Las reseñas se cargarán dinámicamente -->
        </div>
      </div>
    </div>
  `;
}

// Crear visualización de estrellas (solo lectura)
function createStarDisplay(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHtml = '';
    
    // Estrellas completas
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<span class="display-star full">★</span>';
    }
    
    // Media estrella
    if (hasHalfStar) {
        starsHtml += '<span class="display-star half">★</span>';
    }
    
    // Estrellas vacías
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<span class="display-star empty">☆</span>';
    }
    
    return starsHtml;
}

// Crear lista de comentarios anteriores
async function createRatingsList(productId) {
  // Consulta a Firestore (inicializa DB e importa funciones dinámicamente)
  const db = await getDb();
  const { query, collection, where, orderBy, getDocs } = await import('firebase/firestore');
  const q = query(
    collection(db, "productRatings"),
    where("productId", "==", productId),
    orderBy("timestamp", "desc")
  );
  const querySnapshot = await getDocs(q);
  const ratings = querySnapshot.docs.map(doc => doc.data());
  if (!ratings.length) {
    return '<div class="no-comments">Aún no hay comentarios para este producto. ¡Sé el primero en comentar!</div>';
  }
  return ratings.map(rating => {
    let date = rating.timestamp && rating.timestamp.toDate ? rating.timestamp.toDate() : new Date();
    const formattedDate = date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const userInitial = rating.name ? rating.name[0].toUpperCase() : '?';
    const starsDisplay = createStarDisplay(rating.rating);
    return `
      <div class="rating-item">
        <div class="rating-item-header">
          <div class="user-avatar">${userInitial}</div>
          <div class="rating-item-info">
            <div class="rating-item-stars">${starsDisplay}</div>
            <div class="rating-item-date">${formattedDate}</div>
          </div>
        </div>
        <div class="rating-item-comment">${rating.comment}</div>
        <div class="rating-item-name">${rating.name || ''}</div>
      </div>
    `;
  }).join('');
}

// Inicializar sistema de estrellas
function initializeStarRating(container) {
  const stars = container.querySelectorAll('.star');
  const saveBtn = container.querySelector('.btn-rating.save');
  const cancelBtn = container.querySelector('.btn-rating.cancel');
  const commentTextarea = container.querySelector('.rating-comment');
  const nameInput = container.querySelector('.rating-name');
  const characterCount = container.querySelector('.character-count');
  const successMessage = container.querySelector('.rating-success');
  const productId = container.querySelector('.star-rating').dataset.productId;
  const toggleCommentsBtn = container.querySelector('.btn-toggle-comments');
  const ratingsList = container.querySelector('.ratings-list');
  let selectedRating = 0;

  // Contador de caracteres
  commentTextarea.addEventListener('input', () => {
    const currentLength = commentTextarea.value.length;
    const maxLength = 500;
    characterCount.textContent = `${currentLength}/${maxLength}`;
    characterCount.classList.remove('warning', 'danger');
    if (currentLength > maxLength * 0.8) {
      characterCount.classList.add('warning');
    }
    if (currentLength > maxLength * 0.95) {
      characterCount.classList.add('danger');
    }
  });

  // Manejar hover y click en estrellas
  stars.forEach((star, index) => {
    star.addEventListener('mouseenter', () => {
      highlightStars(index + 1);
    });
    star.addEventListener('click', () => {
      selectedRating = index + 1;
      setSelectedStars(selectedRating);
      saveBtn.disabled = false; // Habilitar botón guardar
    });
  });

  // Restaurar estrellas al salir del hover
  container.querySelector('.star-rating').addEventListener('mouseleave', () => {
    setSelectedStars(selectedRating);
  });

  // Toggle comentarios anteriores
  if (toggleCommentsBtn && ratingsList) {
    toggleCommentsBtn.addEventListener('click', async () => {
      const isVisible = ratingsList.style.display !== 'none';
      ratingsList.style.display = isVisible ? 'none' : 'block';
      const icon = toggleCommentsBtn.querySelector('i');
      const text = toggleCommentsBtn.childNodes[1];
      if (isVisible) {
        icon.className = 'bi bi-chevron-down';
        text.textContent = ' Ver comentarios';
      } else {
        icon.className = 'bi bi-chevron-up';
        text.textContent = ' Ocultar comentarios';
        // Cargar comentarios desde Firestore
        ratingsList.innerHTML = '<div class="loading">Cargando comentarios...</div>';
        const html = await createRatingsList(productId);
        ratingsList.innerHTML = html;
      }
    });
  }

  // Guardar calificación (nombre ahora es opcional; si está vacío se usará 'Anónimo')
  saveBtn.addEventListener('click', async () => {
    if (selectedRating === 0) {
      showNotification('Por favor selecciona una calificación', 'warning');
      return;
    }
    let name = '';
    if (nameInput) name = nameInput.value.trim();
    if (!name) name = 'Anónimo'; // nombre opcional
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';
    const comment = commentTextarea.value.trim();
    try {
      await saveRating(productId, selectedRating, comment, name);
      successMessage.style.display = 'block';
      container.querySelector('.star-rating').style.display = 'none';
      commentTextarea.style.display = 'none';
      if (nameInput) nameInput.style.display = 'none';
      characterCount.style.display = 'none';
      container.querySelector('.rating-actions').style.display = 'none';
      // Actualizar el resumen de calificaciones (opcional: recargar promedio desde Firestore)
      // updateRatingSummary(container, productId);
      // Refrescar promedio desde Firestore para mostrar el resultado correcto
      try {
        await fetchProductRating(productId);
        // Si la lista de comentarios está visible, recargarla
        if (ratingsList && ratingsList.style.display !== 'none') {
          ratingsList.innerHTML = '<div class="loading">Cargando comentarios...</div>';
          const html = await createRatingsList(productId);
          ratingsList.innerHTML = html;
        }
      } catch (err) {
        console.warn('No se pudo actualizar el promedio desde Firestore:', err);
      }

      setTimeout(() => {
        resetRatingForm();
      }, 3000);
    } catch (error) {
      console.error('Error al guardar calificación:', error);
      showNotification('Error al guardar la calificación. Intenta nuevamente.', 'error');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-star-fill"></i> Guardar Calificación';
    }
  });

  // Cancelar calificación
  cancelBtn.addEventListener('click', () => {
    resetRatingForm();
  });

  function highlightStars(rating) {
    stars.forEach((star, index) => {
      star.classList.toggle('active', index < rating);
    });
  }
  function setSelectedStars(rating) {
    stars.forEach((star, index) => {
      star.classList.toggle('active', index < rating);
    });
  }
  function resetRatingForm() {
    selectedRating = 0;
    setSelectedStars(0);
    commentTextarea.value = '';
    nameInput.value = '';
    characterCount.textContent = '0/500';
    characterCount.classList.remove('warning', 'danger');
    successMessage.style.display = 'none';
    container.querySelector('.star-rating').style.display = 'flex';
    commentTextarea.style.display = 'block';
    nameInput.style.display = 'block';
    characterCount.style.display = 'block';
    container.querySelector('.rating-actions').style.display = 'flex';
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="bi bi-star-fill"></i> Guardar Calificación';
  }
}

// Guardar calificación en Firestore (usa getDb e import dinámico)
async function saveRating(productId, rating, comment, name) {
  try {
    if (!name || !name.trim()) throw new Error('El nombre es obligatorio');
    const dbInstance = await getDb();
    const firestore = await import('firebase/firestore');
    const { addDoc, collection, serverTimestamp } = firestore;
    const ratingData = {
      productId,
      rating,
      comment: comment || '',
      name: name.trim(),
      timestamp: serverTimestamp()
    };
    await addDoc(collection(dbInstance, 'productRatings'), ratingData);
    showNotification('¡Calificación guardada! Gracias por tu opinión', 'success');
    return ratingData;
  } catch (error) {
    showNotification('Error al guardar la calificación. Intenta nuevamente.', 'error');
    throw error;
  }
}

// Generar ID único para calificaciones
function generateRatingId() {
    return 'rating_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Generar ID único de usuario (simplificado)
function generateUserId() {
    let userId = localStorage.getItem('tempUserId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('tempUserId', userId);
    }
    return userId;
}

// Obtener calificación promedio de un producto
function getProductRating(productId) {
    const ratings = JSON.parse(localStorage.getItem('productRatings') || '[]');
    const productRatings = ratings.filter(r => r.productId === productId);
    
    if (productRatings.length === 0) {
        return { average: 0, count: 0 };
    }
    
    const sum = productRatings.reduce((acc, r) => acc + r.rating, 0);
    const average = (sum / productRatings.length).toFixed(1);
    
    return {
        average: parseFloat(average),
        count: productRatings.length
    };
}

// Función para mostrar notificaciones (simplificada)
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="notification-icon bi bi-${getNotificationIcon(type)}"></i>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    // Agregar al contenedor de notificaciones o crear uno
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-triangle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Consultar Firestore para obtener promedio y conteo reales y actualizar la UI
async function fetchProductRating(productId) {
  try {
    const dbInstance = await getDb();
    const firestore = await import('firebase/firestore');
    const { query, collection, where, getDocs } = firestore;
    const q = query(collection(dbInstance, 'productRatings'), where('productId', '==', productId));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(d => d.data());
    const count = docs.length;
    const average = count === 0 ? 0 : (docs.reduce((s, r) => s + (r.rating || 0), 0) / count);

    // Actualizar elementos del modal si existen
    const modal = document.getElementById('generic-modal');
    if (!modal) return { average: parseFloat(average.toFixed(1)), count };
    const avgStarsContainers = modal.querySelectorAll('.average-stars, .average-stars-inline');
    const avgScoreEls = modal.querySelectorAll('.average-score, .average-score-inline');
    const ratingCountEls = modal.querySelectorAll('.rating-count, .rating-count-inline');

    const starsHtml = createStarDisplay(parseFloat(average.toFixed(1)));
    avgStarsContainers.forEach(el => { el.innerHTML = starsHtml; });
    avgScoreEls.forEach(el => { el.textContent = parseFloat(average.toFixed(1)); });
    ratingCountEls.forEach(el => {
      if (el.classList.contains('rating-count-inline')) {
        el.textContent = ` · ${count} ${count === 1 ? 'reseña' : 'reseñas'}`;
      } else {
        el.textContent = `(${count} ${count === 1 ? 'calificación' : 'calificaciones'})`;
      }
    });

    // Si hay reseñas, desplegarlas automáticamente dentro del modal
    if (count > 0) {
      const ratingsList = modal.querySelector('.ratings-list');
      const toggleBtn = modal.querySelector('.btn-toggle-comments');
      if (ratingsList) {
        ratingsList.style.display = 'block';
        ratingsList.innerHTML = '<div class="loading">Cargando reseñas...</div>';
        try {
          const html = await createRatingsList(productId);
          ratingsList.innerHTML = html;
        } catch (err) {
          ratingsList.innerHTML = '<div class="no-comments">No se pudieron cargar las reseñas.</div>';
        }
      }
      if (toggleBtn) {
        const icon = toggleBtn.querySelector('i');
        icon.className = 'bi bi-chevron-up';
        toggleBtn.childNodes[1] && (toggleBtn.childNodes[1].textContent = ' Ocultar reseñas');
      }
    }

    return { average: parseFloat(average.toFixed(1)), count };
  } catch (error) {
    console.error('fetchProductRating error:', error);
    throw error;
  }
}


