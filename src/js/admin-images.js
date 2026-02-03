import { getCollectionDocs } from './admin-data.js';
import { formatDate } from './admin-utils.js';

let cachedImages = [];

const tableBody = () => document.querySelector('#images-table tbody');

const renderTable = () => {
  const tbody = tableBody();
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!cachedImages.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="3">Sin registros por ahora.</td>';
    tbody.appendChild(row);
    return;
  }

  cachedImages.forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.name || item.id || '-'}</td>
      <td>${item.description || '-'}</td>
      <td>${formatDate(item.updated_at || item.created_at)}</td>
    `;
    tbody.appendChild(row);
  });
};

const loadImages = async () => {
  cachedImages = await getCollectionDocs('images_metadata', { orderByField: 'updated_at' });
  renderTable();
};

export const initImagesSection = async () => {
  await loadImages();
};
