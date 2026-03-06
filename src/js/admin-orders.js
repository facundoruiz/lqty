import { getCollectionDocs } from './admin-data.js';

let cachedOrders = [];

const tableBody = () => document.querySelector('#orders-table tbody');
const orderDetailModal = () => document.getElementById('order-detail-modal');
const orderDetailBody = () => document.getElementById('order-detail-body');
const orderDetailClose = () => document.getElementById('order-detail-close');

function formatOrderItems(items) {
  if (!items || !items.length) return '-';
  return items
    .map((i) => {
      const label = i.gramos ? `${i.title} - ${i.gramos}gr` : i.title;
      return `${label} × ${i.quantity}`;
    })
    .join('; ');
}

function openOrderDetail(index) {
  const order = cachedOrders[index];
  if (!order) return;
  const modal = orderDetailModal();
  const body = orderDetailBody();
  if (!modal || !body) return;

  const fecha = order.fecha ? new Date(order.fecha).toLocaleString('es-AR') : '-';
  const cliente = [order.nombre, order.apellido].filter(Boolean).join(' ') || '-';
  const itemsHtml =
    order.items && order.items.length
      ? order.items
          .map((i) => {
            const label = i.gramos ? `${i.title} - ${i.gramos}gr` : i.title;
            return `<li>${label} × ${i.quantity}</li>`;
          })
          .join('')
      : '<li>Sin ítems</li>';

  body.innerHTML = `
    <dl class="order-detail-dl">
      <dt>Fecha</dt>
      <dd>${fecha}</dd>
      <dt>Cliente</dt>
      <dd>${cliente}</dd>
      <dt>Teléfono</dt>
      <dd>${order.telefono || '-'}</dd>
      <dt>Tipo de entrega</dt>
      <dd>${order.tipo_entrega === 'domicilio' ? 'Envío a domicilio' : 'Retiro en local'}</dd>
      ${order.tipo_entrega === 'domicilio' && order.domicilio ? `<dt>Domicilio</dt><dd>${order.domicilio}</dd>` : ''}
      ${order.notas ? `<dt>Notas</dt><dd>${order.notas}</dd>` : ''}
      <dt>Detalle del pedido</dt>
      <dd><ul class="order-detail-items">${itemsHtml}</ul></dd>
    </dl>
  `;
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
}

function closeOrderDetail() {
  const modal = orderDetailModal();
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
}

const renderTable = () => {
  const tbody = tableBody();
  if (!tbody) return;
  tbody.innerHTML = '';

  cachedOrders.forEach((order, index) => {
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
      <td><button type="button" class="btn-small" data-order-index="${index}" data-action="view-order">Ver</button></td>
    `;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll('[data-action="view-order"]').forEach((btn) => {
    btn.addEventListener('click', () => openOrderDetail(parseInt(btn.dataset.orderIndex, 10)));
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
  const modal = orderDetailModal();
  const closeBtn = orderDetailClose();
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeOrderDetail();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeOrderDetail);
};
