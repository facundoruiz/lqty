import { getCollectionDocs, updateCollectionDoc, serverTimestamp, getDb } from './admin-data.js';
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
import { deductStockFromRecipe, validateStockAvailable, revertStockDeduction, getLowStockArticles, isStockBelowMinimum } from './services/stockService.js';

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

  const isConfirmed = order.status === 'confirmed' || order.stock_deducted;
  const buttonText = isConfirmed ? 'Stock ya descontado' : 'Confirmar y descontar stock';
  const buttonClass = isConfirmed ? 'btn-disabled' : 'btn-primary';

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
      <dt>Estado</dt>
      <dd>${order.status || 'Pendiente'}</dd>
    </dl>
    <div class="form-actions">
      <button type="button" class="${buttonClass}" id="confirm-order-btn" ${isConfirmed ? 'disabled' : ''}>
        ${buttonText}
      </button>
    </div>
  `;

  const confirmBtn = body.querySelector('#confirm-order-btn');
  if (confirmBtn && !isConfirmed) {
    confirmBtn.addEventListener('click', () => handleConfirmOrder(order.id, index));
  }

  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
}

function closeOrderDetail() {
  const modal = orderDetailModal();
  if (!modal) return;

  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
}

/**
 * Maneja la confirmación de una orden y el descuento de stock
 */
async function handleConfirmOrder(orderId, orderIndex) {
  try {
    const confirmBtn = document.querySelector('#confirm-order-btn');
    if (!confirmBtn) return;
    
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Procesando...';

    const order = cachedOrders[orderIndex];
    if (!order || !order.items || order.items.length === 0) {
      showErrorNotification('La orden no tiene items válidos.');
      return;
    }

    const db = await getDb();

    // Procesar cada item de la orden
    let successCount = 0;
    let errorMessages = [];

    for (const item of order.items) {
      if (!item.product_id) {
        errorMessages.push(`Item "${item.title}" sin ID de producto`);
        continue;
      }

      try {
        // Obtener el producto
        const firestore = window.firebase.firestore;
        const getDoc = firestore.getDoc;
        const doc = firestore.doc;
        const collection = firestore.collection;

        const productRef = doc(collection(db, 'products'), item.product_id);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
          errorMessages.push(`Producto "${item.title}" no encontrado`);
          continue;
        }

        const product = productSnap.data();
        const quantity = item.quantity || 1;

        // Validar y descontar stock
        const result = await deductStockFromRecipe(db, item.product_id, quantity);

        if (result.success) {
          successCount++;
          // Notificar si hay alertas de stock bajo
          if (result.deducted && result.deducted.length > 0) {
            const lowStockItems = result.deducted.filter(d => isStockBelowMinimum(d));
            if (lowStockItems.length > 0) {
              const names = lowStockItems.map(d => d.articulo_nombre).join(', ');
              showWarningNotification(`Atención: Stock bajo en: ${names}`);
            }
          }
        } else {
          errorMessages.push(`${item.title}: ${result.message}`);
        }
      } catch (error) {
        errorMessages.push(`Error procesando "${item.title}": ${error.message}`);
      }
    }

    // Actualizar estado de la orden en Firestore
    if (successCount > 0) {
      await updateCollectionDoc('orders', orderId, {
        status: 'confirmed',
        stock_deducted: true,
        confirmed_at: serverTimestamp()
      });
    }

    // Mostrar resultados
    if (errorMessages.length === 0) {
      showSuccessNotification(`Orden confirmada. Stock descontado para ${successCount} producto(s).`);
      loadOrders(); // Recargar para actualizar UI
      closeOrderDetail();
    } else {
      const message = errorMessages.join('\n');
      showErrorNotification(`Errores: ${message}`);
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirmar y descontar stock';
    }
  } catch (error) {
    console.error('Error confirmando orden:', error);
    showErrorNotification(`Error al procesar la orden: ${error.message}`);
    const confirmBtn = document.querySelector('#confirm-order-btn');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirmar y descontar stock';
    }
  }
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

  // Monitorear alertas de stock bajo cada 30 segundos
  setInterval(async () => {
    try {
      const db = await getDb();
      const lowStockArticles = await getLowStockArticles(db);
      if (lowStockArticles.length > 0) {
        // Solo mostrar si hay alertas nuevas (opcional)
        console.log(`Alertas de stock bajo: ${lowStockArticles.map(a => a.title).join(', ')}`);
      }
    } catch (error) {
      console.error('Error verificando stock bajo:', error);
    }
  }, 30000);

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
