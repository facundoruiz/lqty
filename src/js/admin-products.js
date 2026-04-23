import { addCollectionDoc, getCollectionDocs, updateCollectionDoc, serverTimestamp, docRef } from './admin-data.js';
import { cropAndCompressImageToDataURL, formatDate, isCropCancelledError, placeholderImage } from './admin-utils.js';
import { showErrorNotification, showSuccessNotification } from './utils/notifications.js';
import { setEditorContent } from './admin-wysiwyg.js';

let cachedCategories = [];
let cachedBlogs = [];
let cachedProducts = [];
let recipeState = []; // Estado para la receta seleccionada: { articulo_id, cantidad, unidad }

const productTableBody = () => document.querySelector('#products-table tbody');
const categorySelect = () => document.getElementById('product-category-select');
const categoryFilter = () => document.getElementById('products-filter-category');
const relatedBlogsContainer = () => document.getElementById('product-related-blogs');
const formEl = () => document.getElementById('product-form');
const formTitle = () => document.getElementById('product-form-title');
const imagePreview = () => document.getElementById('product-image-preview');
const imageInput = () => document.getElementById('product-image-file');

const resetForm = () => {
  const form = formEl();
  if (!form) return;
  form.reset();
  form.querySelector('[name="id"]').value = '';
  if (formTitle()) formTitle().textContent = 'Crear producto';
  setEditorContent('[data-editor="product-description"]', '');
  if (imagePreview()) {
    imagePreview().style.backgroundImage = '';
    imagePreview().textContent = 'Sin imagen seleccionada';
  }
  recipeState = [];
  renderRecipeItems();
};

const fillCategorySelects = () => {
  const select = categorySelect();
  const filter = categoryFilter();
  if (!select || !filter) return;

  select.innerHTML = '<option value="">Seleccioná una categoría</option>';
  filter.innerHTML = '<option value="all">Todas las categorías</option>';

  cachedCategories.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.dataset.categoryId = cat.category_id || cat.id;
    option.textContent = cat.category_name || cat.name || 'Sin nombre';
    select.appendChild(option);

    const filterOption = document.createElement('option');
    filterOption.value = cat.category_id || cat.id;
    filterOption.textContent = option.textContent;
    filter.appendChild(filterOption);
  });
};

const renderRelatedBlogs = (selected = []) => {
  const container = relatedBlogsContainer();
  if (!container) return;
  container.innerHTML = '';

  cachedBlogs.forEach((blog) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = blog.id;
    checkbox.checked = selected.some((item) => item.articulo_id === blog.id);
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        // Agregar a la receta si no existe
        if (!recipeState.find(r => r.articulo_id === blog.id)) {
          recipeState.push({
            articulo_id: blog.id,
            articulo_nombre: blog.title || 'Sin título',
            cantidad: 100,
            unidad: 'gramos',
            stock_unit_original: blog.stock_unit || 'gramos'
          });
        }
      } else {
        // Quitar de la receta
        recipeState = recipeState.filter(r => r.articulo_id !== blog.id);
      }
      renderRecipeItems();
    });
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(blog.title || 'Sin título'));
    container.appendChild(label);
  });
};

// Renderiza los items de la receta con campos para cantidad y unidad
const renderRecipeItems = () => {
  const itemsList = document.getElementById('recipe-items-list');
  if (!itemsList) return;
  itemsList.innerHTML = '';

  if (recipeState.length === 0) {
    itemsList.innerHTML = '<p style="color: #999; font-size: 0.9em;">No hay artículos seleccionados</p>';
    return;
  }

  const table = document.createElement('table');
  table.style.cssText = 'width: 100%; border-collapse: collapse; margin-top: 1rem;';
  table.innerHTML = `
    <thead>
      <tr style="border-bottom: 1px solid #ddd;">
        <th style="text-align: left; padding: 0.5rem;">Artículo</th>
        <th style="text-align: left; padding: 0.5rem; width: 120px;">Cantidad</th>
        <th style="text-align: left; padding: 0.5rem; width: 120px;">Unidad</th>
        <th style="text-align: left; padding: 0.5rem; width: 80px;">Acción</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  recipeState.forEach((item, index) => {
    const row = document.createElement('tr');
    row.style.cssText = 'border-bottom: 1px solid #eee;';
    row.innerHTML = `
      <td style="padding: 0.5rem;">${item.articulo_nombre}</td>
      <td style="padding: 0.5rem;">
        <input type="number" class="field" value="${item.cantidad}" min="1" style="width: 100%; padding: 0.25rem; box-sizing: border-box;" />
      </td>
      <td style="padding: 0.5rem;">
        <select class="field" style="width: 100%; padding: 0.25rem; box-sizing: border-box;">
          <option value="gramos" ${item.unidad === 'gramos' ? 'selected' : ''}>Gramos</option>
          <option value="unidades" ${item.unidad === 'unidades' ? 'selected' : ''}>Unidades</option>
        </select>
      </td>
      <td style="padding: 0.5rem;">
        <button type="button" class="btn-small btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8em;">
          Quitar
        </button>
      </td>
    `;

    const cantInput = row.querySelector('input[type="number"]');
    const unitSelect = row.querySelector('select');
    const quitarBtn = row.querySelector('button.btn-danger');

    cantInput.addEventListener('change', (e) => {
      const newCant = parseInt(e.target.value, 10);
      if (newCant > 0) {
        recipeState[index].cantidad = newCant;
      } else {
        e.target.value = recipeState[index].cantidad;
      }
    });

    unitSelect.addEventListener('change', (e) => {
      recipeState[index].unidad = e.target.value;
    });

    quitarBtn.addEventListener('click', (e) => {
      e.preventDefault();
      recipeState.splice(index, 1);
      // Desmarcar el checkbox correspondiente
      const checkbox = relatedBlogsContainer()?.querySelector(`input[value="${item.articulo_id}"]`);
      if (checkbox) checkbox.checked = false;
      renderRecipeItems();
    });

    tbody.appendChild(row);
  });

  itemsList.appendChild(table);
};

const renderProductsTable = () => {
  const tbody = productTableBody();
  if (!tbody) return;
  tbody.innerHTML = '';

  const filterValue = categoryFilter()?.value || 'all';
  const items = cachedProducts.filter((product) => {
    if (filterValue === 'all') return true;
    return product.category_id === filterValue || product.category_ref?.id === filterValue;
  });

  items.forEach((product) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.title || product.name || '-'}</td>
      <td>${product.category_name || '-'}</td>
      <td>${product.active ? 'Sí' : 'No'}</td>
      <td>${product.featured ? 'Sí' : 'No'}</td>
      <td>${formatDate(product.updated_at || product.created_at)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-small" data-action="edit" data-id="${product.id}">Editar</button>
          <button class="btn-small btn-danger" data-action="disable" data-id="${product.id}">
            ${product.active ? 'Deshabilitar' : 'Habilitar'}
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
};

const mapRelatedBlogs = (ids) => {
  return ids
    .map((id) => cachedBlogs.find((blog) => blog.id === id))
    .filter(Boolean)
    .map((blog) => ({
      id: blog.id,
      title: blog.title || '',
      descripcion: blog.excerpt || blog.content || ''
    }));
};

const loadProducts = async () => {
  cachedProducts = await getCollectionDocs('products', { orderByField: 'updated_at' });
  renderProductsTable();
};

const loadCategories = async () => {
  cachedCategories = await getCollectionDocs('categories', { orderByField: 'category_name', orderDirection: 'asc' });
  fillCategorySelects();
};

const loadBlogs = async () => {
  cachedBlogs = await getCollectionDocs('blogs', { orderByField: 'updated_at' });
  renderRelatedBlogs();
};

const populateForm = (product) => {
  const form = formEl();
  if (!form) return;

  form.querySelector('[name="id"]').value = product.id;
  form.querySelector('[name="name"]').value = product.title || product.name || '';
  const priceEl = form.querySelector('[name="price"]');
  if (priceEl) priceEl.value = product.price != null && product.price !== '' ? Number(product.price) : '';
  form.querySelector('[name="bajada"]').value = product.bajada || '';
  form.querySelector('[name="active"]').checked = Boolean(product.active);
  form.querySelector('[name="featured"]').checked = Boolean(product.featured);
  form.querySelector('[name="es_insumo"]').checked = Boolean(product.es_insumo);
  form.querySelector('[name="es_vendible"]').checked = Boolean(product.es_vendible);

  let categoryId = product.category_ref?.id || '';
  if (!categoryId && product.category_id) {
    const match = cachedCategories.find((cat) => cat.category_id === product.category_id);
    categoryId = match?.id || '';
  }
  form.querySelector('[name="category_id"]').value = categoryId;

  setEditorContent('[data-editor="product-description"]', product.description || '');
  
  // Cargar la receta (puede ser related_blogs antiguo o receta nuevo)
  const recetaOld = product.related_blogs || [];
  const recetaNew = product.receta || [];
  const recetaToLoad = recetaNew.length > 0 ? recetaNew : recetaOld;
  
  // Convertir old format a new format si es necesario
  recipeState = recetaToLoad.map((item) => ({
    articulo_id: item.articulo_id || item.id,
    articulo_nombre: item.articulo_nombre || item.title || 'Sin título',
    cantidad: item.cantidad || 100,
    unidad: item.unidad || 'gramos',
    stock_unit_original: item.stock_unit_original || 'gramos'
  }));
  
  renderRelatedBlogs(recipeState);
  renderRecipeItems();

  const imageBase64 = product.image_path || '';
  const preview = imagePreview();
  if (preview) {
    if (imageBase64) {
      preview.style.backgroundImage = `url(${imageBase64})`;
      preview.textContent = '';
      form.querySelector('[name="image_base64"]').value = imageBase64;
    } else {
      preview.style.backgroundImage = '';
      preview.textContent = 'Sin imagen seleccionada';
    }
  }

  if (formTitle()) formTitle().textContent = 'Editar producto';
};

const handleTableClick = (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = button.dataset.id;
  const action = button.dataset.action;
  const product = cachedProducts.find((item) => item.id === id);
  if (!product) return;

  if (action === 'edit') {
    populateForm(product);
    return;
  }

  if (action === 'disable') {
    const newState = !product.active;
    updateCollectionDoc('products', id, {
      active: newState,
      publish_web: newState ? '1' : '0',
      updated_at: serverTimestamp()
    }).then(() => {
      showSuccessNotification(`Producto ${newState ? 'habilitado' : 'deshabilitado'}.`);
      loadProducts();
    }).catch(() => showErrorNotification('No se pudo actualizar el producto.'));
  }
};

const setupImageInput = () => {
  const input = imageInput();
  const preview = imagePreview();
  if (!input || !preview) return;

  preview.textContent = 'Sin imagen seleccionada';
  input.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = formEl();
    const hiddenField = form?.querySelector('[name="image_base64"]');
    const previousImage = hiddenField?.value || '';
    try {
      const dataUrl = await cropAndCompressImageToDataURL(file, {
        targetWidth: 356,
        targetHeight: 200,
        maxBytes: 800 * 1024,
        mimeType: 'image/jpeg'
      });
      preview.style.backgroundImage = `url(${dataUrl})`;
      preview.textContent = '';
      if (hiddenField) hiddenField.value = dataUrl;
    } catch (err) {
      if (isCropCancelledError(err)) {
        event.target.value = '';
        return;
      }
      console.error('Error procesando imagen:', err);
      showErrorNotification(err?.message || 'No se pudo procesar la imagen.');
      event.target.value = '';
      if (previousImage) {
        preview.style.backgroundImage = `url(${previousImage})`;
        preview.textContent = '';
        if (hiddenField) hiddenField.value = previousImage;
      } else {
        preview.style.backgroundImage = '';
        preview.textContent = 'Sin imagen seleccionada';
        if (hiddenField) hiddenField.value = '';
      }
    }
  });
};

const handleSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const id = form.querySelector('[name="id"]').value;
  const name = form.querySelector('[name="name"]').value.trim();
  const priceRaw = form.querySelector('[name="price"]')?.value?.trim();
  const price = priceRaw !== '' && priceRaw != null ? parseFloat(priceRaw) : undefined;
  const bajada = form.querySelector('[name="bajada"]').value.trim();
  const description = form.querySelector('[name="description"]').value.trim();
  const imageBase64 = form.querySelector('[name="image_base64"]').value;
  const categoryId = form.querySelector('[name="category_id"]').value;
  const active = form.querySelector('[name="active"]').checked;
  const featured = form.querySelector('[name="featured"]').checked;
  const es_insumo = form.querySelector('[name="es_insumo"]').checked;
  const es_vendible = form.querySelector('[name="es_vendible"]').checked;

  const category = cachedCategories.find((cat) => cat.id === categoryId);
  if (!category) {
    showErrorNotification('Seleccioná una categoría válida.');
    return;
  }

  // Validar receta
  if (recipeState.some(item => item.cantidad <= 0)) {
    showErrorNotification('Todos los artículos en la receta deben tener cantidad > 0.');
    return;
  }

  const payload = {
    title: name,
    name,
    bajada,
    description,
    image_path: imageBase64 || placeholderImage(name),
    category_id: category.category_id || category.id,
    category_name: category.category_name || category.name,
    category_description: category.category_description || '',
    category_ref: await docRef('categories', category.id),
    active,
    featured,
    es_insumo,
    es_vendible,
    publish_web: active ? '1' : '0',
    receta: recipeState, // Nueva estructura con cantidades
    updated_at: serverTimestamp()
  };
  if (price !== undefined) payload.price = price;

  if (!id) {
    payload.created_at = serverTimestamp();
    await addCollectionDoc('products', payload);
    showSuccessNotification('Producto creado.');
  } else {
    await updateCollectionDoc('products', id, payload);
    showSuccessNotification('Producto actualizado.');
  }

  resetForm();
  await loadProducts();
};

export const initProductsSection = async () => {
  await loadCategories();
  await loadBlogs();
  await loadProducts();
  setupImageInput();
  renderRecipeItems(); // Inicializar vista de receta vacía

  const form = formEl();
  const table = productTableBody()?.closest('table');
  const resetBtn = document.getElementById('product-form-reset');
  const newBtn = document.getElementById('btn-new-product');
  const filter = categoryFilter();

  if (form) {
    form.addEventListener('submit', handleSubmit);

    // Validación en tiempo real para precio
    const priceInput = form.querySelector('[name="price"]');
    if (priceInput) {
      priceInput.addEventListener('blur', (e) => {
        let value = parseFloat(e.target.value);
        if (isNaN(value) || value < 0) {
          e.target.value = '';
        } else if (value > 0) {
          e.target.value = value.toFixed(2);
        }
      });
    }
  }

  if (table) table.addEventListener('click', handleTableClick);
  if (resetBtn) resetBtn.addEventListener('click', resetForm);
  if (newBtn) newBtn.addEventListener('click', resetForm);
  if (filter) filter.addEventListener('change', renderProductsTable);

  window.addEventListener('categories:updated', (event) => {
    if (Array.isArray(event.detail)) {
      cachedCategories = event.detail;
      fillCategorySelects();
      renderProductsTable();
    }
  });
};
