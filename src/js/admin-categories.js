import { addCollectionDoc, getCollectionDocs, updateCollectionDoc, serverTimestamp } from './admin-data.js';
import { showErrorNotification, showSuccessNotification } from './utils/notifications.js';
import { slugify } from './admin-utils.js';

let cachedCategories = [];

const tableBody = () => document.querySelector('#categories-table tbody');
const formEl = () => document.getElementById('category-form');
const formTitle = () => document.getElementById('category-form-title');

const resetForm = () => {
  const form = formEl();
  if (!form) return;
  form.reset();
  form.querySelector('[name="id"]').value = '';
  if (formTitle()) formTitle().textContent = 'Crear categoría';
};

const renderTable = () => {
  const tbody = tableBody();
  if (!tbody) return;
  tbody.innerHTML = '';

  cachedCategories.forEach((category) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${category.category_name || '-'}</td>
      <td>${category.category_id || '-'}</td>
      <td>${category.category_description || '-'}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-small" data-action="edit" data-id="${category.id}">Editar</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
};

const loadCategories = async () => {
  cachedCategories = await getCollectionDocs('categories', { orderByField: 'category_name', orderDirection: 'asc' });
  renderTable();
  window.dispatchEvent(new CustomEvent('categories:updated', { detail: cachedCategories }));
};

const populateForm = (category) => {
  const form = formEl();
  if (!form) return;
  form.querySelector('[name="id"]').value = category.id;
  form.querySelector('[name="category_name"]').value = category.category_name || '';
  form.querySelector('[name="category_id"]').value = category.category_id || '';
  form.querySelector('[name="category_description"]').value = category.category_description || '';
  if (formTitle()) formTitle().textContent = 'Editar categoría';
};

const handleTableClick = (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = button.dataset.id;
  const category = cachedCategories.find((item) => item.id === id);
  if (category) populateForm(category);
};

const handleSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const id = form.querySelector('[name="id"]').value;
  const category_name = form.querySelector('[name="category_name"]').value.trim();
  let category_id = form.querySelector('[name="category_id"]').value.trim();
  const category_description = form.querySelector('[name="category_description"]').value.trim();

  if (!category_name) {
    showErrorNotification('El nombre es obligatorio.');
    return;
  }

  if (!category_id) {
    category_id = slugify(category_name);
  }

  const payload = {
    category_name,
    category_id,
    category_description,
    updated_at: serverTimestamp()
  };

  if (!id) {
    payload.created_at = serverTimestamp();
    await addCollectionDoc('categories', payload);
    showSuccessNotification('Categoría creada.');
  } else {
    await updateCollectionDoc('categories', id, payload);
    showSuccessNotification('Categoría actualizada.');
  }

  resetForm();
  await loadCategories();
};

export const initCategoriesSection = async () => {
  await loadCategories();

  const form = formEl();
  const table = tableBody()?.closest('table');
  const resetBtn = document.getElementById('category-form-reset');

  if (form) form.addEventListener('submit', handleSubmit);
  if (table) table.addEventListener('click', handleTableClick);
  if (resetBtn) resetBtn.addEventListener('click', resetForm);
};
