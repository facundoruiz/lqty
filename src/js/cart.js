/**
 * Carrito de pedidos (canasto). Estado en memoria y persistencia opcional en localStorage.
 */

const STORAGE_KEY = 'lqty_cart';
let cart = [];
const listeners = new Set();

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) cart = JSON.parse(raw);
    else cart = [];
  } catch (_) {
    cart = [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (_) {}
  listeners.forEach(fn => fn(cart));
}

export function getCart() {
  if (cart.length === 0) loadCart();
  return [...cart];
}

function itemKey(productId, gramos) {
  return productId + '|' + (gramos ?? '');
}

export function addToCart(product, quantity = 1, gramos = null) {
  if (!product || !product.id) return;
  loadCart();
  const key = itemKey(product.id, gramos);
  const existing = cart.find(item => itemKey(item.productId, item.gramos) === key);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      productId: product.id,
      title: product.title || '',
      image_path: product.image_path || '',
      quantity,
      gramos: gramos ?? null,
    });
  }
  saveCart();
}

export function updateQuantity(productId, gramos, quantity) {
  loadCart();
  const key = itemKey(productId, gramos);
  const item = cart.find(i => itemKey(i.productId, i.gramos) === key);
  if (!item) return;
  if (quantity <= 0) {
    cart = cart.filter(i => itemKey(i.productId, i.gramos) !== key);
  } else {
    item.quantity = quantity;
  }
  saveCart();
}

export function removeFromCart(productId, gramos = null) {
  loadCart();
  const key = itemKey(productId, gramos);
  cart = cart.filter(i => itemKey(i.productId, i.gramos) !== key);
  saveCart();
}

export function clearCart() {
  cart = [];
  saveCart();
}

export function getCartCount() {
  if (cart.length === 0) loadCart();
  return cart.reduce((sum, i) => sum + i.quantity, 0);
}

/** Etiqueta para mostrar en lista/checkout: "Título - 30gr x 2" o "Título x 2" */
export function getItemDisplayLabel(item) {
  const title = item.title || 'Producto';
  if (item.gramos) return `${title} - ${item.gramos}gr`;
  return title;
}

export function subscribe(callback) {
  listeners.add(callback);
  callback(getCart());
  return () => listeners.delete(callback);
}

loadCart();
