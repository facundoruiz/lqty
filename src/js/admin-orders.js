import { getCollectionDocs } from './admin-data.js';
import { showErrorNotification, showSuccessNotification, showWarningNotification } from './utils/notifications.js';
import {
  ensureOrderNotificationPermission,
  formatOrderDate,
  getOrderCustomer,
  getOrderDeliveryLabel,
  getOrderItemsSummary,
  showBrowserOrderNotification,
  subscribeToOrdersRealtime,
} from './services/orderNotifications.js';

let cachedOrders = [];
let unsubscribeOrders = null;

const tableBody = () => document.querySelector('#orders-table tbody');
const orderDetailModal = () => document.getElementById('order-detail-modal');
const orderDetailBody = () => document.getElementById('order-detail-body');
const orderDetailClose = () => document.getElementById('order-detail-close');

function formatOrderItems(items) {
  return getOrderItemsSummary(items);
}

function activateOrdersSection() {
  const ordersTab = document.querySelector('.nav-item[data-section="section-orders"]');
  if (ordersTab && !ordersTab.classList.contains('active')) {
    ordersTab.click();
  }
}

function notifyNewOrder(order) {
  const customer = getOrderCustomer(order);
  const itemsSummary = formatOrderItems(order.items);
  const message =
    itemsSummary === '-' ? `Nuevo pedido de ${customer}.` : `Nuevo pedido de ${customer}: ${itemsSummary}`;

  showSuccessNotification(message, 8000);
  showBrowserOrderNotification(order, () => {
    activateOrdersSection();
    const orderIndex = cachedOrders.findIndex((item) => item.id === order.id);
    if (orderIndex >= 0) {
      openOrderDetail(orderIndex);
    }
  });
}

function openOrderDetail(index) {
  const order = cachedOrders[index];
  if (!order) return;

  const modal = orderDetailModal();
  const body = orderDetailBody();
  if (!modal || !body) return;

  const fecha = formatOrderDate(order.fecha);
  const cliente = getOrderCustomer(order) || '-';
  const itemsHtml =
    Array.isArray(order.items) && order.items.length
      ? order.items
          .map((item) => {
            const label = item.gramos ? `${item.title} - ${item.gramos}gr` : item.title;
            return `<li>${label} x ${item.quantity}</li>`;
          })
          .join('')
      : '<li>Sin items</li>';

  body.innerHTML = `
    <dl class="order-detail-dl">
      <dt>Fecha</dt>
      <dd>${fecha}</dd>
      <dt>Cliente</dt>
      <dd>${cliente}</dd>
      <dt>Telefono</dt>
      <dd>${order.telefono || '-'}</dd>
      <dt>Tipo de entrega</dt>
      <dd>${order.tipo_entrega === 'domicilio' ? 'Envio a domicilio' : 'Retiro en local'}</dd>
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
  if (!modal) return;

  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
}

const renderTable = () => {
  const tbody = tableBody();
  if (!tbody) return;

  tbody.innerHTML = '';

  cachedOrders.forEach((order, index) => {
    const row = document.createElement('tr');
    const fecha = formatOrderDate(order.fecha);
    const cliente = getOrderCustomer(order) || '-';
    const entrega = getOrderDeliveryLabel(order);
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
  } catch (error) {
    console.error('Error cargando pedidos:', error);
    cachedOrders = [];
  }

  renderTable();
};

const subscribeOrders = async () => {
  if (typeof unsubscribeOrders === 'function') {
    unsubscribeOrders();
    unsubscribeOrders = null;
  }

  unsubscribeOrders = await subscribeToOrdersRealtime({
    onOrdersChange: (orders) => {
      cachedOrders = orders;
      renderTable();
    },
    onNewOrder: (order) => {
      notifyNewOrder(order);
    },
    onError: async (error) => {
      console.error('Error escuchando pedidos en tiempo real:', error);
      showErrorNotification('No se pudo activar la actualizacion automatica de pedidos.');
      await loadOrders();
    },
  });
};

export const initOrdersSection = async () => {
  await ensureOrderNotificationPermission({
    notifyGranted: () => {
      showSuccessNotification('Notificaciones del navegador activadas para pedidos nuevos.');
    },
    notifyDenied: () => {
      showWarningNotification(
        'Las notificaciones del navegador quedaron bloqueadas. Los avisos seguiran apareciendo dentro del panel.',
        9000
      );
    },
  });

  await subscribeOrders();

  const modal = orderDetailModal();
  const closeBtn = orderDetailClose();

  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeOrderDetail();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeOrderDetail);
  }

  window.addEventListener(
    'beforeunload',
    () => {
      if (typeof unsubscribeOrders === 'function') {
        unsubscribeOrders();
        unsubscribeOrders = null;
      }
    },
    { once: true }
  );
};
