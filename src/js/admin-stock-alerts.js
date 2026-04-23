import { getDb } from '../firebase-config.js';
import { getLowStockArticles, isStockBelowMinimum, calculateStockDeduction } from './services/stockService.js';
import { getCollectionDocs } from './admin-data.js';
import { showErrorNotification, showWarningNotification } from './utils/notifications.js';

let lowStockArticles = [];
let allProducts = [];

const stockAlertsContainer = () => document.getElementById('stock-alerts-container');
const refreshBtn = () => document.getElementById('btn-refresh-stock-alerts');

/**
 * Renderiza la tabla de alertas de stock bajo
 */
const renderStockAlerts = () => {
  const container = stockAlertsContainer();
  if (!container) return;

  if (lowStockArticles.length === 0) {
    container.innerHTML = '<p style="color: #888; text-align: center; padding: 2rem;">✓ Todo el stock está en niveles óptimos</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'admin-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Artículo</th>
        <th>Stock Actual</th>
        <th>Unidad</th>
        <th>Stock Mínimo</th>
        <th>Disponible</th>
        <th>Productos que lo usan</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');

  lowStockArticles.forEach((article) => {
    // Encontrar qué productos usan este artículo
    const usedInProducts = allProducts
      .filter((p) => {
        const receta = p.receta || p.related_blogs || [];
        return receta.some((item) => (item.articulo_id || item.id) === article.id);
      })
      .map((p) => p.title || p.name)
      .slice(0, 3);

    const productsText = usedInProducts.length > 0
      ? `${usedInProducts.join(', ')}${usedInProducts.length < (allProducts.filter(p => {
          const receta = p.receta || p.related_blogs || [];
          return receta.some((item) => (item.articulo_id || item.id) === article.id);
        }).length) ? '...' : ''}`
      : 'Sin usos conocidos';

    const row = document.createElement('tr');
    row.style.cssText = article.stock === 0 ? 'background-color: #ffe6e6; color: #d32f2f;' : article.stock <= article.cantidad_minima ? 'background-color: #fff3cd; color: #856404;' : '';
    
    row.innerHTML = `
      <td><strong>${article.title || 'Sin título'}</strong></td>
      <td>${article.stock || 0}</td>
      <td>${article.stock_unit || 'gramos'}</td>
      <td>${article.cantidad_minima || 0}</td>
      <td>${article.disponible ? '✓' : '✗'}</td>
      <td style="font-size: 0.85em; color: #666;">${productsText}</td>
      <td>
        <button type="button" class="btn-small" data-action="edit-stock" data-article-id="${article.id}">
          Reabastcer
        </button>
      </td>
    `;

    const editBtn = row.querySelector('[data-action="edit-stock"]');
    if (editBtn) {
      editBtn.addEventListener('click', () => handleEditStock(article));
    }

    tbody.appendChild(row);
  });

  container.innerHTML = '';
  container.appendChild(table);
};

/**
 * Carga las alertas de stock bajo desde Firestore
 */
const loadStockAlerts = async () => {
  try {
    const container = stockAlertsContainer();
    if (container) {
      container.innerHTML = '<p style="color: #999; text-align: center;">Cargando alertas de stock...</p>';
    }

    const db = await getDb();

    // Obtener artículos con stock bajo
    lowStockArticles = await getLowStockArticles(db);

    // Obtener todos los productos para mostrar uso
    allProducts = await getCollectionDocs('products', { orderByField: 'title' });

    renderStockAlerts();

    // Mostrar notificación si hay alertas críticas
    const criticalArticles = lowStockArticles.filter((a) => a.stock === 0);
    if (criticalArticles.length > 0) {
      showWarningNotification(
        `⚠️ Stock crítico en: ${criticalArticles.map((a) => a.title).join(', ')}`,
        10000
      );
    }
  } catch (error) {
    console.error('Error cargando alertas de stock:', error);
    const container = stockAlertsContainer();
    if (container) {
      container.innerHTML = '<p style="color: #d32f2f;">Error al cargar las alertas de stock</p>';
    }
    showErrorNotification('Error al cargar alertas de stock');
  }
};

/**
 * Abre un modal para editar el stock de un artículo
 */
const handleEditStock = (article) => {
  const newStock = prompt(
    `Nuevo stock para "${article.title}"\nStock actual: ${article.stock}\nStock mínimo: ${article.cantidad_minima}`,
    article.stock || 0
  );

  if (newStock === null) return; // Usuario canceló

  const numStock = parseInt(newStock, 10);
  if (isNaN(numStock) || numStock < 0) {
    showErrorNotification('Ingresá un número válido');
    return;
  }

  // Aquí iría la lógica para actualizar el stock
  // Por ahora, mostrar mensaje
  showWarningNotification(`Función de actualización directa no implementada aún. Stock a guardar: ${numStock}`);
};

/**
 * Inicializa la sección de alertas de stock
 */
export const initStockAlertsSection = async () => {
  await loadStockAlerts();

  const btn = refreshBtn();
  if (btn) {
    btn.addEventListener('click', loadStockAlerts);
  }

  // Actualizar alertas cada 5 minutos
  setInterval(loadStockAlerts, 5 * 60 * 1000);
};
