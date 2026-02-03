import { deleteCollectionDoc, getCollectionDocs } from './admin-data.js';
import { formatDate } from './admin-utils.js';
import { showErrorNotification, showSuccessNotification } from './utils/notifications.js';

let cachedRatings = [];

const tableBody = () => document.querySelector('#ratings-table tbody');

const renderTable = () => {
  const tbody = tableBody();
  if (!tbody) return;
  tbody.innerHTML = '';

  cachedRatings.forEach((rating) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rating.productId || '-'}</td>
      <td>${rating.rating || '-'}</td>
      <td>${rating.comment || '-'}</td>
      <td>${rating.name || '-'}</td>
      <td>${formatDate(rating.timestamp)}</td>
      <td>
        <button class="btn-small btn-danger" data-id="${rating.id}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(row);
  });
};

const loadRatings = async () => {
  cachedRatings = await getCollectionDocs('productRatings', { orderByField: 'timestamp' });
  renderTable();
};

const handleTableClick = (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = button.dataset.id;
  if (!id) return;
  if (!window.confirm('¿Eliminar comentario definitivamente?')) return;

  deleteCollectionDoc('productRatings', id)
    .then(() => {
      showSuccessNotification('Comentario eliminado.');
      loadRatings();
    })
    .catch(() => showErrorNotification('No se pudo eliminar el comentario.'));
};

export const initRatingsSection = async () => {
  await loadRatings();
  const table = tableBody()?.closest('table');
  if (table) table.addEventListener('click', handleTableClick);
};
