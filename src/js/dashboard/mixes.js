import { db } from '../../firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

const mixesCollectionRef = collection(db, 'userMixes'); // Colección para las mezclas de usuarios
const herbsCollectionRef = collection(db, 'blogs'); // Colección de hierbas (blogs)

let currentUserMixes = []; // Para mantener el estado de las mezclas cargadas
let availableHerbs = []; // Para mantener las hierbas disponibles para selección

// Referencias a elementos del DOM
let mixModalElement;
let mixFormElement;
let mixModalTitleElement;
let mixIdInput;
let herbsSelectionContainer;
let userMixesListElement;
let emptyMixesElement;
let loadingIndicatorMixes;
let searchHerbsInput;
let selectedHerbsCount;
let selectedHerbsText;

// Inicializar referencias a elementos del DOM
const initDOMReferences = () => {
    userMixesListElement = document.getElementById('user-mixes-list');
    emptyMixesElement = document.getElementById('empty-mixes');
    loadingIndicatorMixes = document.querySelector('#mixes .loading-indicator');
    
    mixModalElement = document.getElementById('mix-modal');
    mixFormElement = document.getElementById('mix-form');
    mixModalTitleElement = document.getElementById('mix-modal-title');
    mixIdInput = document.getElementById('mix-id');
    herbsSelectionContainer = document.getElementById('herbs-selection-container');
    searchHerbsInput = document.getElementById('search-herbs');
    selectedHerbsCount = document.getElementById('selected-herbs-count');
    selectedHerbsText = document.getElementById('selected-herbs-text');
};

// Función para mostrar/ocultar el indicador de carga
const showLoadingMixes = (show) => {
    if (loadingIndicatorMixes) {
        loadingIndicatorMixes.style.display = show ? 'block' : 'none';
    }
};

// Función para mostrar/ocultar el estado de mezclas vacías
const showEmptyMixesState = (show) => {
    initDOMReferences(); // Asegurar que tenemos la referencia
    if (emptyMixesElement) {
        emptyMixesElement.style.display = show ? 'flex' : 'none';
    }
};

// Actualizar el contador de hierbas seleccionadas
const updateSelectedHerbsCount = () => {
    if (!selectedHerbsCount || !selectedHerbsText) return;
    
    const count = document.querySelectorAll('#herbs-selection-container input[name="selectedHerbs"]:checked').length;
    selectedHerbsCount.textContent = count;
    
    if (count === 0) {
        selectedHerbsText.textContent = "0 hierbas seleccionadas";
    } else if (count === 1) {
        selectedHerbsText.textContent = "1 hierba seleccionada";
    } else {
        selectedHerbsText.textContent = `${count} hierbas seleccionadas`;
    }
};

// Buscar hierbas por nombre
const searchHerbs = (searchTerm) => {
    const herbItems = document.querySelectorAll('.herb-item');
    
    if (searchTerm.trim() === '') {
        // Si el campo de búsqueda está vacío, mostrar todas las hierbas
        herbItems.forEach(item => {
            item.style.display = 'flex';
        });
        return;
    }
    
    const searchTermLower = searchTerm.toLowerCase().trim();
    
    herbItems.forEach(item => {
        const herbName = item.querySelector('label').textContent.toLowerCase();
        if (herbName.includes(searchTermLower)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
};

// Filtrar hierbas por categoría
const filterHerbsByCategory = (category) => {
    const herbItems = document.querySelectorAll('.herb-item');
    
    if (category === 'all') {
        herbItems.forEach(item => {
            item.style.display = 'flex';
        });
        return;
    }
    
    herbItems.forEach(item => {
        const herbCategories = item.dataset.categories ? item.dataset.categories.split(',') : [];
        if (herbCategories.includes(category)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
};

// Cargar hierbas disponibles para selección en el modal
export const loadHerbsForSelection = async () => {
    initDOMReferences(); // Asegurar que tenemos referencias
    
    if (!herbsSelectionContainer) {
        console.warn("El contenedor para selección de hierbas no fue encontrado en el DOM.");
        return;
    }
    
    try {
        // Solo cargar hierbas si no tenemos datos
        if (availableHerbs.length === 0) {
            const querySnapshot = await getDocs(collection(db, 'blogs'));
            availableHerbs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        // Limpiar contenedor y mostrar indicador de carga
        const loadingIndicator = document.querySelector('#herbs-selection-container .loading-indicator');
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        
        const herbsGrid = document.querySelector('#herbs-selection-container .herbs-grid');
        if (herbsGrid) herbsGrid.innerHTML = '';
        
        if (availableHerbs.length === 0) {
            if (herbsGrid) {
                herbsGrid.innerHTML = '<p class="no-herbs">No hay hierbas disponibles para seleccionar.</p>';
            }
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        // Ordenar hierbas por nombre
        availableHerbs.sort((a, b) => {
            const nameA = (a.title || a.name || '').toLowerCase();
            const nameB = (b.title || b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        // Crear elementos para cada hierba
        availableHerbs.forEach(herb => {
            const herbItem = document.createElement('div');
            herbItem.classList.add('herb-item');
            
            // Asignar categorías como datos para filtrar luego
            let categories = [];
            if (herb.categories && Array.isArray(herb.categories)) {
                categories = herb.categories;
            } else if (herb.tags && Array.isArray(herb.tags)) {
                categories = herb.tags;
            }
            herbItem.dataset.categories = categories.join(',').toLowerCase();
            
            // Crear checkbox con imagen y nombre
            const herbName = herb.title || herb.name || 'Sin nombre';
            let imageUrl = herb.image || herb.thumbnail || '';
            
            // Si la imagen tiene ruta absoluta, la usamos, si no, generamos una ruta relativa
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `./uploads/blogs/thumb_${imageUrl}`;
            }
            
            herbItem.innerHTML = `
                <input type="checkbox" id="herb-${herb.id}" name="selectedHerbs" value="${herb.id}">
                ${imageUrl ? `<img src="${imageUrl || './asset/img/logo_gris.jpeg'}" alt="${herbName}" class="herb-thumbnail" onerror="this.src='./asset/img/logo.png';">` : ''}
                <label for="herb-${herb.id}">${herbName}</label>
            `;
            
            // Agregar listener para el cambio de estado del checkbox
            herbItem.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
                if (e.target.checked) {
                    herbItem.classList.add('selected');
                } else {
                    herbItem.classList.remove('selected');
                }
                updateSelectedHerbsCount();
            });
            
            if (herbsGrid) {
                herbsGrid.appendChild(herbItem);
            }
        });
        
        // Ocultar indicador de carga
        if (loadingIndicator) loadingIndicator.style.display = 'none';

    } catch (error) {
        console.error("Error al cargar hierbas para selección:", error);
        if (herbsSelectionContainer) {
            herbsSelectionContainer.innerHTML = `
                <p class="error-message">Error al cargar las hierbas para selección.</p>
                <p class="error-details">Detalles: ${error.message}</p>
                <button id="retry-load-herbs" class="btn btn-primary">
                    Intentar nuevamente
                </button>
            `;
            
            // Agregar listener para el botón de reintentar
            const retryBtn = document.getElementById('retry-load-herbs');
            if (retryBtn) {
                retryBtn.addEventListener('click', loadHerbsForSelection);
            }
        }
    }
};

// Cargar mezclas del usuario desde Firestore
export const loadUserMixes = async (userId) => {
    initDOMReferences(); // Asegurar que tenemos las referencias DOM
    
    showLoadingMixes(true);
    showEmptyMixesState(false);
    
    if (!userMixesListElement) {
        console.warn("El contenedor de mezclas del usuario no fue encontrado en el DOM.");
        return;
    }
    
    userMixesListElement.innerHTML = ''; // Limpiar lista antes de cargar
    
    try {
        // Intentar cargar mezclas con ordenación por fecha
        try {
            const q = query(mixesCollectionRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            currentUserMixes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (indexError) {
            // Si hay un error de índice, intentamos una consulta más simple
            console.warn('Error con índice compuesto, intentando consulta sin ordenación');
            const simpleQuery = query(mixesCollectionRef, where("userId", "==", userId));
            const simpleSnapshot = await getDocs(simpleQuery);
            currentUserMixes = simpleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ordenar manualmente
            currentUserMixes.sort((a, b) => {
                if (!a.createdAt || !b.createdAt) return 0;
                return b.createdAt.seconds - a.createdAt.seconds;
            });
        }
        
        // Si no hay hierbas cargadas, cargarlas ahora para mostrar nombres en lugar de IDs
        if (availableHerbs.length === 0) {
            try {
                const herbsSnapshot = await getDocs(collection(db, 'blogs'));
                availableHerbs = herbsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error("Error al cargar hierbas para mostrar nombres en mezclas:", error);
            }
        }
        
        displayUserMixes(currentUserMixes);
    } catch (error) {
        console.error("Error al cargar mezclas del usuario:", error);
        if (userMixesListElement) {
            userMixesListElement.innerHTML = `
                <div class="error-message">
                    <p>Error al cargar las mezclas.</p>
                    <p class="error-details">Detalles: ${error.message}</p>
                    <button id="retry-load-mixes" class="btn btn-primary">
                        Intentar nuevamente
                    </button>
                </div>
            `;
            
            // Agregar listener para el botón de reintentar
            const retryBtn = document.getElementById('retry-load-mixes');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => loadUserMixes(userId));
            }
        }
    } finally {
        showLoadingMixes(false);
    }
};

// Mostrar mezclas del usuario en el DOM
export const displayUserMixes = (mixesToDisplay) => {
    initDOMReferences(); // Asegurar que tenemos las referencias DOM
    
    if (!userMixesListElement) return;
    userMixesListElement.innerHTML = ''; // Limpiar la lista actual
    
    if (mixesToDisplay.length === 0) {
        showEmptyMixesState(true);
        return;
    }
    
    showEmptyMixesState(false);

    // Crear contenedor grid para mostrar mezclas en columnas
    const mixesGrid = document.createElement('div');
    mixesGrid.classList.add('mixes-grid');
    userMixesListElement.appendChild(mixesGrid);

    mixesToDisplay.forEach(mix => {
        const mixItem = document.createElement('div');
        mixItem.classList.add('mix-card');
        mixItem.dataset.id = mix.id;

        // Mostrar nombres de hierbas en lugar de solo IDs
        const herbNames = mix.selectedHerbs && Array.isArray(mix.selectedHerbs) ? 
            mix.selectedHerbs.map(herbId => {
                const foundHerb = availableHerbs.find(h => h.id === herbId);
                return foundHerb ? (foundHerb.title || foundHerb.name || 'Hierba') : 'Hierba';
            }).join(', ') : 'Ninguna hierba seleccionada';

        // Formatear fecha
        const createdDate = mix.createdAt ? 
            new Date(mix.createdAt.seconds * 1000).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }) : 
            'Fecha desconocida';

        // Crear el HTML para la tarjeta de mezcla
        mixItem.innerHTML = `
            <div class="mix-card-header">
                <h3 class="mix-name">${mix.mixName}</h3>
                <div class="mix-actions">
                    <button class="btn-icon edit-mix-btn" title="Editar mezcla">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-icon continue-iteration-btn" title="Continuar iteración">
                        <i class="bi bi-arrow-right-circle"></i>
                    </button>
                    <button class="btn-icon delete-mix-btn" title="Eliminar mezcla">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="mix-card-body">
                <p class="mix-description">${mix.mixDescription || 'Sin descripción'}</p>
                <div class="mix-herbs-container">
                    <h4>Hierbas:</h4>
                    <ul class="mix-herbs-list">
                        ${mix.selectedHerbs && Array.isArray(mix.selectedHerbs) ? 
                            mix.selectedHerbs.map(herbId => {
                                const foundHerb = availableHerbs.find(h => h.id === herbId);
                                const herbName = foundHerb ? (foundHerb.title || foundHerb.name || 'Hierba') : 'Hierba';
                                return `<li>${herbName}</li>`;
                            }).join('') : 
                            '<li>Ninguna hierba seleccionada</li>'
                        }
                    </ul>
                </div>
            </div>
            <div class="mix-card-footer">
                <span class="mix-date"><i class="bi bi-calendar3"></i> ${createdDate}</span>
                <button class="btn-share" title="Compartir por WhatsApp">
                    <i class="bi bi-whatsapp"></i> Compartir
                </button>
            </div>
        `;
        
        // Agregar listeners para los botones
        mixItem.querySelector('.edit-mix-btn').addEventListener('click', () => openMixModal(mix.id));
        mixItem.querySelector('.delete-mix-btn').addEventListener('click', () => {
            // Mostrar confirmación antes de eliminar
            if (confirm(`¿Estás seguro de que deseas eliminar la mezcla "${mix.mixName}"?`)) {
                const userId = mix.userId;
                deleteMix(mix.id, userId);
            }
        });
        
        // Agregar listener para el botón de compartir por WhatsApp
        const shareBtn = mixItem.querySelector('.btn-share');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                const text = `*${mix.mixName}*\n${mix.mixDescription || ''}\n\nHierbas: ${herbNames}\n\nCompartido desde La que tomo Yo!`;
                const encodedText = encodeURIComponent(text);
                const whatsappUrl = `https://wa.me/?text=${encodedText}`;
                window.open(whatsappUrl, '_blank');
            });
        }
        
        mixesGrid.appendChild(mixItem);
    });
    
    // Aplicar estilos a la cuadrícula de mezclas
    addMixesGridStyles();
};

// Función para agregar estilos dinámicamente a la cuadrícula de mezclas
const addMixesGridStyles = () => {
    // Verificar si ya existe el elemento de estilo
    let style = document.getElementById('mixes-grid-styles');
    
    if (!style) {
        style = document.createElement('style');
        style.id = 'mixes-grid-styles';
        style.textContent = `
            .mixes-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }
            
            .mix-card {
                background-color: white;
                border-radius: 10px;
                box-shadow: 0 3px 10px rgba(0,0,0,0.08);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                transition: transform 0.3s, box-shadow 0.3s;
            }
            
            .mix-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.12);
            }
            
            .mix-card-header {
                padding: 15px 20px;
                background-color: var(--secondary-color);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .mix-name {
                margin: 0;
                font-size: 1.1rem;
                font-weight: 600;
            }
            
            .mix-actions {
                display: flex;
                gap: 5px;
            }
            
            .btn-icon {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 1.1rem;
                padding: 3px 5px;
                border-radius: 3px;
                transition: background 0.2s;
            }
            
            .btn-icon:hover {
                background-color: rgba(255,255,255,0.2);
            }
            
            .delete-mix-btn {
                color: #ffcccc;
            }
            
            .delete-mix-btn:hover {
                color: #ffffff;
            }
            
            .mix-card-body {
                padding: 15px 20px;
                flex-grow: 1;
                display: flex;
                flex-direction: column;
            }
            
            .mix-description {
                margin-bottom: 15px;
                color: #555;
            }
            
            .mix-herbs-container {
                margin-top: auto;
            }
            
            .mix-herbs-container h4 {
                font-size: 1rem;
                margin-bottom: 5px;
                color: #444;
            }
            
            .mix-herbs-list {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
            }
            
            .mix-herbs-list li {
                background-color: #f4f9f0;
                padding: 4px 10px;
                border-radius: 15px;
                font-size: 0.85rem;
                border: 1px solid #dbe9d1;
            }
            
            .mix-card-footer {
                padding: 10px 20px;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background-color: #f9faf7;
            }
            
            .mix-date {
                color: #777;
                font-size: 0.85rem;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .btn-share {
                background-color: #25D366;
                color: white;
                border: none;
                padding: 5px 12px;
                border-radius: 15px;
                font-size: 0.85rem;
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-share:hover {
                background-color: #128C7E;
            }
            
            @media (max-width: 767px) {
                .mixes-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Abrir modal de mezcla (para crear o editar)
export const openMixModal = async (mixId = null) => {
    try {
        initDOMReferences(); // Asegurar que tenemos las referencias actualizadas
        
        // Mostrar el modal con clase para animación
        if (mixModalElement) {
            mixModalElement.style.display = 'block';
            
            // Agregar clase para animación después de un breve delay
            setTimeout(() => {
                mixModalElement.classList.add('visible');
            }, 10);
        } else {
            console.error('No se encontró el modal en el DOM');
            return;
        }
        
        // Reiniciar el formulario
        if (mixFormElement) mixFormElement.reset();
        
        // Cargar las hierbas disponibles
        await loadHerbsForSelection();
        
        // Configurar el modal según sea crear o editar
        if (mixId) {
            // Editar mezcla existente
            mixModalTitleElement.textContent = 'Editar Mezcla';
            
            const mix = currentUserMixes.find(m => m.id === mixId);
            if (mix) {
                // Llenar datos del formulario
                document.getElementById('mix-name').value = mix.mixName || '';
                document.getElementById('mix-description').value = mix.mixDescription || '';
                document.getElementById('mix-id').value = mixId;
                
                // Marcar hierbas seleccionadas
                if (mix.selectedHerbs && Array.isArray(mix.selectedHerbs)) {
                    document.querySelectorAll('.herb-item input[type="checkbox"]').forEach(checkbox => {
                        if (mix.selectedHerbs.includes(checkbox.value)) {
                            checkbox.checked = true;
                            checkbox.closest('.herb-item')?.classList.add('selected');
                        }
                    });
                }
                
                updateSelectedHerbsCount();
            }
        } else {
            // Crear nueva mezcla
            mixModalTitleElement.textContent = 'Crear Nueva Mezcla';
            document.getElementById('mix-id').value = '';
        }
        
        // Configurar eventos para búsqueda y filtros de hierbas
        if (searchHerbsInput) {
            searchHerbsInput.addEventListener('input', (e) => {
                searchHerbs(e.target.value);
            });
        }
        
        // Configurar filtros de categorías
        document.querySelectorAll('.herbs-filter .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remover clase active de todos los botones
                document.querySelectorAll('.herbs-filter .filter-btn').forEach(b => {
                    b.classList.remove('active');
                });
                
                // Agregar clase active al botón clickeado
                e.target.classList.add('active');
                
                // Filtrar hierbas por categoría
                filterHerbsByCategory(e.target.dataset.filter);
            });
        });
        
        // Configurar botón de cancelar
        const cancelBtn = document.getElementById('cancel-mix-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeMixModal);
        }
        
    } catch (error) {
        console.error('Error al abrir el modal de mezcla:', error);
        alert('Ocurrió un error al abrir el formulario. Por favor, intenta nuevamente.');
    }
};

// Cerrar modal de mezcla con animación
export const closeMixModal = () => {
    if (mixModalElement) {
        // Remover clase para animación de salida
        mixModalElement.classList.remove('visible');
        
        // Ocultar después de que termine la animación
        setTimeout(() => {
            mixModalElement.style.display = 'none';
        }, 300); // Tiempo igual a la duración de la transición CSS
    }
};

// Guardar mezcla (nueva o existente)
export const saveMix = async (event, userId) => {
    event.preventDefault();
    
    if (!userId) {
        alert('Debes iniciar sesión para guardar mezclas.');
        return;
    }

    const mixNameInput = document.getElementById('mix-name');
    const mixDescriptionInput = document.getElementById('mix-description');
    const mixIdInput = document.getElementById('mix-id');
    
    if (!mixNameInput || !mixDescriptionInput || !mixIdInput) {
        alert('Error al acceder al formulario. Intenta nuevamente.');
        return;
    }
    
    const mixName = mixNameInput.value.trim();
    const mixDescription = mixDescriptionInput.value.trim();
    const id = mixIdInput.value;

    // Recolectar hierbas seleccionadas
    const selectedHerbs = [];
    document.querySelectorAll('.herb-item input[type="checkbox"]:checked').forEach(checkbox => {
        selectedHerbs.push(checkbox.value);
    });

    // Validaciones
    if (!mixName) {
        alert('El nombre de la mezcla es obligatorio.');
        mixNameInput.focus();
        return;
    }
    
    if (selectedHerbs.length === 0) {
        alert('Debes seleccionar al menos una hierba para la mezcla.');
        return;
    }

    // Datos de la mezcla
    const mixData = {
        userId,
        mixName,
        mixDescription,
        selectedHerbs,
    };

    try {
        // Mostrar indicador de carga en el botón de guardar
        const submitBtn = document.querySelector('#mix-form + .modal-footer .btn-primary');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass"></i> Guardando...';
        }
        
        if (id) {
            // Actualizar mezcla existente
            const mixRef = doc(db, 'userMixes', id);
            await updateDoc(mixRef, { 
                ...mixData,
                updatedAt: serverTimestamp()
            });
        } else {
            // Crear nueva mezcla
            await addDoc(mixesCollectionRef, { 
                ...mixData, 
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp() 
            });
        }
        
        // Cerrar modal y recargar mezclas
        closeMixModal();
        await loadUserMixes(userId);
        
        // Mostrar notificación de éxito
        const action = id ? 'actualizada' : 'creada';
        showNotification(`Mezcla ${action} correctamente`, 'success');
        
    } catch (error) {
        console.error("Error al guardar la mezcla:", error);
        showNotification('Error al guardar la mezcla', 'error');
    } finally {
        // Restaurar botón
        const submitBtn = document.querySelector('#mix-form + .modal-footer .btn-primary');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Guardar Mezcla';
        }
    }
};

// Eliminar mezcla
export const deleteMix = async (mixId, userId) => {
    try {
        await deleteDoc(doc(db, 'userMixes', mixId));
        await loadUserMixes(userId); // Recargar mezclas del usuario
        showNotification('Mezcla eliminada correctamente', 'success');
    } catch (error) {
        console.error("Error al eliminar la mezcla:", error);
        showNotification('Error al eliminar la mezcla', 'error');
    }
};

// Mostrar notificación
const showNotification = (message, type = 'info') => {
    // Verificar si ya existe un contenedor de notificaciones
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(notificationContainer);
    }
    
    // Crear notificación
    const notification = document.createElement('div');
    notification.classList.add('notification', `notification-${type}`);
    notification.style.cssText = `
        background-color: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#cce5ff'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#004085'};
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        margin-bottom: 10px;
        animation: slideIn 0.3s ease-out;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        max-width: 400px;
        border-left: 5px solid ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#004085'};
    `;
    
    // Contenido de la notificación
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                <i class="bi ${type === 'success' ? 'bi-check-circle' : type === 'error' ? 'bi-exclamation-circle' : 'bi-info-circle'}"></i>
            </div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" aria-label="Cerrar notificación">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    // Agregar estilos adicionales a los elementos internos
    notification.querySelector('.notification-content').style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    notification.querySelector('.notification-icon').style.cssText = `
        font-size: 1.2rem;
    `;
    
    notification.querySelector('.notification-close').style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
        color: inherit;
        opacity: 0.7;
        transition: opacity 0.2s;
    `;
    
    // Agregar evento para cerrar la notificación
    notification.querySelector('.notification-close').addEventListener('click', () => {
        closeNotification(notification);
    });
    
    // Agregar la notificación al contenedor
    notificationContainer.appendChild(notification);
    
    // Cerrar automáticamente después de 5 segundos
    setTimeout(() => {
        closeNotification(notification);
    }, 5000);
};

// Función para cerrar una notificación con animación
const closeNotification = (notificationElement) => {
    if (!notificationElement) return;
    
    // Agregar animación de salida
    notificationElement.style.animation = 'slideOut 0.3s ease-out forwards';
    
    // Eliminar después de que termine la animación
    setTimeout(() => {
        if (notificationElement.parentNode) {
            notificationElement.parentNode.removeChild(notificationElement);
        }
    }, 300);
};

// Agregar estilos de animación para las notificaciones
const addNotificationsStyles = () => {
    let style = document.getElementById('notification-animations');
    
    if (!style) {
        style = document.createElement('style');
        style.id = 'notification-animations';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Inicializar las animaciones al cargar
addNotificationsStyles();

// Mostrar diálogo de confirmación para continuar con la iteración
export const showContinueIterationConfirm = (mixId) => {
    return new Promise((resolve) => {
        Swal.fire({
            title: '¿Desea continuar con la iteración?',
            text: 'Esta acción marcará la mezcla como lista para continuar con el siguiente paso de la iteración.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            resolve(result.isConfirmed);
        });
    });
};

// Manejar la acción de continuar con la iteración
export const handleContinueIteration = async (event) => {
    try {
        const mixCardElement = event.target.closest('.mix-card');
        const mixId = mixCardElement.getAttribute('data-mix-id');
        
        const confirmed = await showContinueIterationConfirm(mixId);
        
        if (confirmed) {
            // Mostrar indicador de carga
            Swal.fire({
                title: 'Procesando...',
                text: 'Actualizando estado de la mezcla',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Actualizar el estado de la mezcla para continuar con la siguiente iteración
            const response = await fetch(`/api/mixes/${mixId}/continue-iteration`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error al actualizar la mezcla');
            }

            // Actualizar la interfaz
            Swal.fire({
                title: 'Éxito',
                text: 'La mezcla está lista para continuar con la siguiente iteración',
                icon: 'success',
                confirmButtonText: 'Aceptar'
            }).then(() => {
                // Recargar las mezclas para mostrar los cambios
                fetchMixes();
            });
        }
    } catch (error) {
        console.error('Error al continuar con la iteración:', error);
        Swal.fire({
            title: 'Error',
            text: 'No se pudo continuar con la iteración. Por favor, inténtelo de nuevo.',
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
    }
};

// Procesar la iteración de la mezcla
export const processMixIteration = async (mixId) => {
    try {
        // Mostrar una notificación de proceso iniciado
        showNotification('Procesando iteración...', 'info');
        
        const mix = currentUserMixes.find(m => m.id === mixId);
        if (!mix) {
            showNotification('No se encontró la mezcla seleccionada', 'error');
            return;
        }
        
        // Aquí iría la lógica para procesar la iteración según los requisitos
        // Por ejemplo: actualizar el estado de la mezcla, enviar datos al servidor, etc.
        
        // Por ahora, simulamos un proceso con un temporizador
        setTimeout(() => {
            showNotification('Iteración completada con éxito', 'success');
            
            // Opcional: actualizar UI o estado de la mezcla si es necesario
        }, 1500);
        
    } catch (error) {
        console.error('Error al procesar la iteración:', error);
        showNotification('Error al procesar la iteración', 'error');
    }
};

// Inicializar listeners y configuración
export const initMixesEvents = (userId) => {
    initDOMReferences();
    
    // Botón para añadir nueva mezcla
    const addMixBtn = document.getElementById('add-mix-btn');
    if (addMixBtn) {
        addMixBtn.addEventListener('click', () => openMixModal());
    }
    
    // Botón para cerrar modal
    const closeMixModalBtn = document.getElementById('close-mix-modal');
    if (closeMixModalBtn) {
        closeMixModalBtn.addEventListener('click', closeMixModal);
    }
    
    // Formulario para guardar mezcla
    const mixForm = document.getElementById('mix-form');
    if (mixForm) {
        mixForm.addEventListener('submit', (e) => saveMix(e, userId));
    }

    // Event delegation para los botones en las tarjetas de mezcla
    document.addEventListener('click', function(e) {
        // Botón de continuar iteración
        if (e.target.closest('.continue-iteration-btn')) {
            const mixCard = e.target.closest('.mix-card');
            const mixId = mixCard.dataset.id;
            const mixName = mixCard.querySelector('.mix-name').textContent;
            
            handleContinueIteration(mixId, mixName);
        }
    });
};
