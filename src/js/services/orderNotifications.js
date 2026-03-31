import { getDb } from '../../firebase-config.js';

const NOTIFICATION_PROMPT_KEY = 'lqty_orders_notifications_prompted';

const firestore = () => window.firebase?.firestore;

function buildOrdersQuery(db) {
  const api = firestore();
  if (!api) {
    throw new Error('Firebase Firestore no esta disponible en window.firebase.');
  }

  const { collection, query, orderBy } = api;
  return query(collection(db, 'orders'), orderBy('fecha', 'desc'));
}

export function parseOrderDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatOrderDate(value) {
  const date = parseOrderDate(value);
  return date ? date.toLocaleString('es-AR') : '-';
}

export function getOrderCustomer(order = {}) {
  const fullName = [order.nombre, order.apellido].filter(Boolean).join(' ').trim();
  return fullName || order.nombre || 'Cliente';
}

export function getOrderItemsSummary(items) {
  if (!Array.isArray(items) || items.length === 0) return '-';

  return items
    .map((item) => {
      const title = item?.title || 'Producto';
      const label = item?.gramos ? `${title} - ${item.gramos}gr` : title;
      return `${label} x ${item?.quantity || 1}`;
    })
    .join('; ');
}

export function getOrderDeliveryLabel(order = {}) {
  if (order.tipo_entrega === 'domicilio') {
    return `Domicilio: ${order.domicilio || '-'}`;
  }

  return 'Retiro en local';
}

export async function ensureOrderNotificationPermission({
  notifyGranted,
  notifyDenied,
} = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;

  try {
    if (window.localStorage?.getItem(NOTIFICATION_PROMPT_KEY) === '1') {
      return Notification.permission;
    }
    window.localStorage?.setItem(NOTIFICATION_PROMPT_KEY, '1');
  } catch (_) {
    // Ignorar errores de localStorage y continuar con el prompt.
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted' && typeof notifyGranted === 'function') {
      notifyGranted();
    }

    if (permission === 'denied' && typeof notifyDenied === 'function') {
      notifyDenied();
    }

    return permission;
  } catch (error) {
    console.warn('No se pudo solicitar permiso de notificaciones:', error);
    return Notification.permission;
  }
}

export function showBrowserOrderNotification(order, onClick) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  const customer = getOrderCustomer(order);
  const items = getOrderItemsSummary(order?.items);
  const delivery = getOrderDeliveryLabel(order);

  const notification = new Notification('Nuevo pedido recibido', {
    body: [customer, items !== '-' ? items : null, delivery].filter(Boolean).join('\n'),
    tag: order?.id ? `order-${order.id}` : undefined,
    icon: './asset/img/favicon-32x32.png',
    badge: './asset/img/favicon-32x32.png',
    requireInteraction: true,
  });

  if (typeof onClick === 'function') {
    notification.onclick = () => {
      try {
        window.focus();
      } catch (_) {
        // Ignorar errores de foco y ejecutar el callback igual.
      }
      onClick(order, notification);
      notification.close();
    };
  }

  return notification;
}

export async function subscribeToOrdersRealtime({
  onOrdersChange,
  onNewOrder,
  onError,
} = {}) {
  const api = firestore();
  if (!api?.onSnapshot) {
    const error = new Error('Firestore onSnapshot no esta disponible.');
    if (typeof onError === 'function') onError(error);
    return () => {};
  }

  const db = await getDb();
  const ordersQuery = buildOrdersQuery(db);
  let initialized = false;

  return api.onSnapshot(
    ordersQuery,
    (snapshot) => {
      const orders = snapshot.docs.map((orderDoc) => ({
        id: orderDoc.id,
        ...orderDoc.data(),
      }));

      if (typeof onOrdersChange === 'function') {
        onOrdersChange(orders);
      }

      if (!initialized) {
        initialized = true;
        return;
      }

      if (typeof onNewOrder === 'function') {
        snapshot.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          onNewOrder({
            id: change.doc.id,
            ...change.doc.data(),
          });
        });
      }
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error);
      } else {
        console.error('Error escuchando pedidos:', error);
      }
    }
  );
}
