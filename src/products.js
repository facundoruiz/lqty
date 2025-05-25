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

    // Agregar event listeners para compartir
    container.querySelectorAll('.btn-share').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar que se active el click del card
        const productId = button.dataset.productId;
        const product = products.find(p => p.id === productId);
        if (product) {
          shareProduct(product);
        }
      });
    });
  }
  
  // Mostrar detalle del producto en un modal
  export function showProductDetail(product, blogs) { // Aceptar blogs como argumento
    const modal = document.getElementById('generic-modal');
    const modalBody = document.getElementById('modal-body');
    const closeModalX = document.getElementById('close-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
  
    if (!modal || !modalBody || !closeModalX || !closeModalBtn) {
      console.error("Elementos del modal no encontrados en el DOM.");
      return;
    }
  
    // Preparar contenido de blogs relacionados
    const relatedBlogsHtml = product.related_blogs && product.related_blogs.length > 0 
      ? `
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
      ` 
      : '';
    
    // Obtener el contenido del disclaimer principal
    const mainDisclaimer = document.querySelector('.disclaimer-content-hierbas span');
    const disclaimerText = mainDisclaimer ? mainDisclaimer.innerHTML : 
        'La información proporcionada en este sitio web es solo para fines informativos y educativos. No pretende diagnosticar, tratar, curar o prevenir ninguna enfermedad. Consulte siempre con un profesional de la salud calificado antes de usar cualquier producto o tratamiento.';    modalBody.innerHTML = `
    <div class="modal-product-header">
        <h2>${product.title}</h2>
        <div class="modal-actions">
            <button class="btn-share" data-product-id="${product.id}">
                <i class="bi bi-share"></i> Compartir
            </button>
        </div>
    </div>
     <img src="${product.image_path|| './asset/img/logo_gris.jpeg'}" alt="${product.title}" >
    
    <p>${product.description || 'Descripción no disponible.'}</p> 
    <button class="disclaimer-btn" title="Declinación de responsabilidad">
            <i class="bi bi-exclamation-triangle"></i> Descargo de responsabilidad
        </button>
        <div class="modal-disclaimer-container" style="display: none;">
          ${disclaimerText}
        </div>
        ${relatedBlogsHtml} 
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
        if (relatedBlog) {
          // En lugar de cerrar el modal y abrir uno nuevo, mostrar el contenido del blog en el mismo modal
          const blogContentDiv = document.getElementById('blog-content-in-product');
          const blogContentContainer = document.getElementById('blog-content-container');
          
          if (blogContentDiv && blogContentContainer) {
            // Mostrar el contenido del blog
            blogContentContainer.innerHTML = `
              <h3>${relatedBlog.title}</h3>
              <p>${relatedBlog.excerpt || 'Contenido no disponible'}</p>
            `;
            blogContentDiv.style.display = 'block';
            
            // Desplazar al contenido del blog con animación suave
            blogContentDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Botón para cerrar el contenido del blog
            const closeButton = document.getElementById('close-blog-content');
            if (closeButton) {
              // Prevenir múltiples listeners quitando y volviéndolo a agregar
              const newCloseButton = closeButton.cloneNode(true);
              closeButton.parentNode.replaceChild(newCloseButton, closeButton);
              
              newCloseButton.addEventListener('click', () => {
                blogContentDiv.style.display = 'none';
              });
            }
          } else {
            console.error("Elementos para mostrar blog no encontrados en el DOM");
          }
        } else {
          console.error("Blog relacionado no encontrado con ID:", blogId);
          // Mensaje de error más amigable
          const blogContentDiv = document.getElementById('blog-content-in-product');
          const blogContentContainer = document.getElementById('blog-content-container');
          
          if (blogContentDiv && blogContentContainer) {
            blogContentContainer.innerHTML = `
              <div class="no-results">No se pudo encontrar el detalle del blog solicitado</div>
            `;
            blogContentDiv.style.display = 'block';
            
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
  
    // Mostrar el modal con animación
    modal.style.display = 'flex';
    // Usar setTimeout para asegurar que se aplique la transición
    setTimeout(() => {
      modal.classList.add('visible');
    }, 10);
  
    // Agregar listeners para cerrar
    closeModalX.addEventListener('click', close);
    closeModalBtn.addEventListener('click', close);
    window.addEventListener('click', closeOutside);
  }  // Función para compartir producto
  function shareProduct(product) {
    const shareData = {
      title: product.title,
      text: `¡Mira esta mezcla de La que tomo Yo!: ${product.title}`,
      url: `${window.location.origin}${window.location.pathname}?mezcla=${product.id}`
    };

    // Verificar si el dispositivo soporta la API Web Share
    if (navigator.share) {
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
            Twitter
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
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
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