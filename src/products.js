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
                <img src="./${product.image_path || 'img/logo_gris.jpeg'}" alt="${product.title}" />
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
    const modal = document.getElementById('blog-modal');
    const modalBody = document.getElementById('modal-body');
    const closeModal = document.getElementById('close-modal');
  
    if (!modal || !modalBody || !closeModal) {
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
      'La información proporcionada en este sitio web es solo para fines informativos y educativos. No pretende diagnosticar, tratar, curar o prevenir ninguna enfermedad. Consulte siempre con un profesional de la salud calificado antes de usar cualquier producto o tratamiento.';

    modalBody.innerHTML = `
    <div class="modal-product-header">
        <h2>${product.title}</h2>
    </div>
     <img src="${product.image_path|| './img/logo_gris.jpeg'}" alt="${product.title}" >
    
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
    
    disclaimerBtn.addEventListener('click', () => {
        disclaimerContainer.style.display = 
            disclaimerContainer.style.display === 'none' ? 'block' : 'none';
    });
  
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
      closeModal.removeEventListener('click', close);
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
    closeModal.removeEventListener('click', close); // Remover listener previo si existe
    window.removeEventListener('click', closeOutside); // Remover listener previo si existe
    closeModal.addEventListener('click', close);
    window.addEventListener('click', closeOutside);
  }

  // Función para compartir producto
  function shareProduct(product) {
    const shareData = {
      title: product.title,
      text: `¡Mira este producto de La que tomo Yo!: ${product.title}`,
      url: `${window.location.origin}${window.location.pathname}#productos/${product.id}`
    };

    if (navigator.share) {
      // API de Web Share (dispositivos móviles)
      navigator.share(shareData)
        .catch(error => console.log('Error al compartir:', error));
    } else {
      // Fallback para navegadores de escritorio
      const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`;
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  }