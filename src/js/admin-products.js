import { addCollectionDoc, getCollectionDocs, updateCollectionDoc, serverTimestamp, docRef } from './admin-data.js';
import { readFileAsDataURL, formatDate, placeholderImage } from './admin-utils.js';
import { showErrorNotification, showSuccessNotification } from './utils/notifications.js';
import { setEditorContent } from './admin-wysiwyg.js';

let cachedCategories = [];
let cachedBlogs = [];
let cachedProducts = [];

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
    checkbox.checked = selected.some((item) => item.id === blog.id || item === blog.id);
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(blog.title || 'Sin título'));
    container.appendChild(label);
  });
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
  renderRelatedBlogs(product.related_blogs || []);

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
    const dataUrl = await readFileAsDataURL(file);
    preview.style.backgroundImage = `url(${dataUrl})`;
    preview.textContent = '';
    formEl().querySelector('[name="image_base64"]').value = dataUrl;
  });
};

const handleSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const id = form.querySelector('[name="id"]').value;
  const name = form.querySelector('[name="name"]').value.trim();
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

  const relatedIds = Array.from(relatedBlogsContainer().querySelectorAll('input:checked')).map((input) => input.value);
  const related_blogs = mapRelatedBlogs(relatedIds);

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
    related_blogs,
    updated_at: serverTimestamp()
  };

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

  const form = formEl();
  const table = productTableBody()?.closest('table');
  const resetBtn = document.getElementById('product-form-reset');
  const newBtn = document.getElementById('btn-new-product');
  const filter = categoryFilter();

  if (form) form.addEventListener('submit', handleSubmit);
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
