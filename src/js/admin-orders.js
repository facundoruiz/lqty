import { getCollectionDocs } from './admin-data.js';

let cachedOrders = [];

const tableBody = () => document.querySelector('#orders-table tbody');

function formatOrderItems(items) {
  if (!items || !items.length) return '-';
  return items
    .map((i) => {
      const label = i.gramos ? `${i.title} - ${i.gramos}gr` : i.title;
      return `${label} × ${i.quantity}`;
    })
    .join('; ');
}

const renderTable = () => {
  const tbody = tableBody();
  if (!tbody) return;
  tbody.innerHTML = '';

  cachedOrders.forEach((order) => {
    const row = document.createElement('tr');
    const fecha = order.fecha ? new Date(order.fecha).toLocaleString('es-AR') : '-';
    const cliente = [order.nombre, order.apellido].filter(Boolean).join(' ') || '-';
    const entrega =
      order.tipo_entrega === 'domicilio'
        ? `Domicilio: ${order.domicilio || '-'}`
        : 'Retiro en local';
    const detalle = formatOrderItems(order.items);
    row.innerHTML = `
      <td>${fecha}</td>
      <td>${cliente}</td>
      <td>${order.telefono || '-'}</td>
      <td>${entrega}</td>
      <td class="orders-detalle-cell" title="${detalle.replace(/"/g, '&quot;')}">${detalle}</td>
    `;
    tbody.appendChild(row);
  });
};

const loadOrders = async () => {
  try {
    cachedOrders = await getCollectionDocs('orders', {
      orderByField: 'fecha',
      orderDirection: 'desc',
    });
  } catch (err) {
    console.error('Error cargando pedidos:', err);
    cachedOrders = [];
  }
  renderTable();
};

export const initOrdersSection = async () => {
  await loadOrders();
};
