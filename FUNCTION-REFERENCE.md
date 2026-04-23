# 📍 Mapa de Funciones: Sistema de Stock

## Ubicación de Cada Función

### 📊 Cálculo de Stock

#### `calculateStockDeduction(product, quantity)`
- **Archivo**: [src/js/services/stockService.js](src/js/services/stockService.js#L14)
- **Entrada**: producto con receta, cantidad vendida
- **Salida**: array de `{ articulo_id, cantidad_a_descontar, unidad }`
- **Uso**: Calcular cuánto descontar sin afectar BD

```javascript
const deductions = calculateStockDeduction(product, 2);
// [{ articulo_id: "h1", cantidad_a_descontar: 1000, unidad: "gramos" }]
```

---

### ✔️ Validación

#### `validateStockAvailable(db, product, quantity)`
- **Archivo**: [src/js/services/stockService.js](src/js/services/stockService.js#L31)
- **Entrada**: db, producto, cantidad
- **Salida**: `{ valid: boolean, message?: string }`
- **Uso**: Verificar ANTES de descontar
- **Lanza errores con mensaje descriptivo**

```javascript
const result = await validateStockAvailable(db, product, 2);
if (!result.valid) {
  console.error(result.message); // "Stock insuficiente de..."
}
```

---

### 💾 Descuento

#### `deductStockFromRecipe(db, productId, quantity)`
- **Archivo**: [src/js/services/stockService.js](src/js/services/stockService.js#L90)
- **Entrada**: db, ID de producto, cantidad
- **Salida**: `{ success, deducted: Array, message }`
- **Función**: Descuenta stock en Firestore
- **Ubicación real**: Se llama desde **[admin-orders.js](src/js/admin-orders.js#L65)**

```javascript
const result = await deductStockFromRecipe(db, "pan-123", 2);
if (result.success) {
  console.log(`Descontado para ${result.deducted.length} artículos`);
  // result.deducted = [{ articulo_id, stock_anterior, stock_nuevo, ... }]
}
```

---

### ↩️ Revertir

#### `revertStockDeduction(db, productId, quantity)`
- **Archivo**: [src/js/services/stockService.js](src/js/services/stockService.js#L213)
- **Entrada**: db, ID de producto, cantidad
- **Salida**: `{ success, message }`
- **Uso**: Restaurar stock si se cancela orden
- **Estado**: No integrado aún (para Fase 7)

```javascript
const result = await revertStockDeduction(db, "pan-123", 2);
// Suma el stock de vuelta
```

---

### 🚨 Alertas

#### `isStockBelowMinimum(article)`
- **Archivo**: [src/js/services/stockService.js](src/js/services/stockService.js#L186)
- **Entrada**: artículo (documento)
- **Salida**: `boolean` (true si stock ≤ cantidad_minima)
- **Uso**: Verificación rápida sin async

```javascript
const isCritical = isStockBelowMinimum(harineArticle);
if (isCritical) {
  showWarningNotification('Stock bajo en Harina');
}
```

---

#### `getLowStockArticles(db)`
- **Archivo**: [src/js/services/stockService.js](src/js/services/stockService.js#L200)
- **Entrada**: db
- **Salida**: `Promise<Array>` de artículos bajo mínimo (ordenado por urgencia)
- **Uso**: Llenar dashboard de alertas
- **Ubicación real**: Se llama desde **[admin-stock-alerts.js](src/js/admin-stock-alerts.js#L38)**

```javascript
const lowStockArticles = await getLowStockArticles(db);
lowStockArticles.forEach(article => {
  console.log(`${article.title}: ${article.stock}/${article.cantidad_minima}`);
});
```

---

## 🎛️ Funciones de UI

### 📋 Admin Blogs

#### `handleSubmit(event)` - Guardar artículo
- **Archivo**: [src/js/admin-blogs.js](src/js/admin-blogs.js#L194)
- **Entrada**: form submit event
- **Salida**: Guardado en Firestore + reload tabla
- **Valida**: stock ≥ 0, cantidad_minima ≥ 0
- **Campos nuevos**: stock, stock_unit, cantidad_minima, disponible

---

#### `populateForm(blog)` - Cargar artículo para editar
- **Archivo**: [src/js/admin-blogs.js](src/js/admin-blogs.js#L58)
- **Entrada**: documento blog
- **Salida**: Formulario poblado
- **Ahora carga**: campos de stock también

---

### 🏭 Admin Productos

#### `handleSubmit(event)` - Guardar producto con receta
- **Archivo**: [src/js/admin-products.js](src/js/admin-products.js#L363)
- **Entrada**: form submit event
- **Salida**: Guardado `receta` en Firestore
- **Valida**: cantidad en receta > 0
- **Novedad**: Lee `recipeState` global y lo guarda como `payload.receta`

---

#### `renderRecipeItems()` - Tabla dinámica de receta
- **Archivo**: [src/js/admin-products.js](src/js/admin-products.js#L65)
- **Entrada**: Lee global `recipeState`
- **Salida**: Renderiza tabla HTML con inputs editables
- **Permite**: Cambiar cantidad, unidad, quitar artículos
- **No guarda**: Solo actualiza memoria (submit guarda)

---

#### `renderRelatedBlogs(selected)` - Checkboxes de artículos
- **Archivo**: [src/js/admin-products.js](src/js/admin-products.js#L47)
- **Entrada**: Array de artículos seleccionados
- **Salida**: Checkboxes sincronizados con tabla
- **Evento**: change → actualiza `recipeState` → re-renderiza tabla

---

### 📦 Admin Órdenes

#### `handleConfirmOrder(orderId, orderIndex)` - Descuento en orden
- **Archivo**: [src/js/admin-orders.js](src/js/admin-orders.js#L56)
- **Entrada**: ID de orden, index en array
- **Salida**: Llamadas a `deductStockFromRecipe()` por cada item
- **Actualiza**: orden a `status: "confirmed"`, `stock_deducted: true`
- **Notifica**: éxito o error por item

```javascript
// Botón "Confirmar y descontar stock" llama:
handleConfirmOrder(order.id, orderIndex);
```

---

#### `openOrderDetail(index)` - Modal de orden
- **Archivo**: [src/js/admin-orders.js](src/js/admin-orders.js#L48)
- **Entrada**: índice en array de órdenes
- **Salida**: Modal con detalles + botón "Confirmar"
- **Novedad**: Muestra botón deshabilitado si ya se descontó stock

---

### 🚨 Admin Alertas Stock

#### `loadStockAlerts()` - Cargar alertas
- **Archivo**: [src/js/admin-stock-alerts.js](src/js/admin-stock-alerts.js#L32)
- **Entrada**: ninguna
- **Salida**: Llama `getLowStockArticles(db)` y renderiza
- **Evento**: Se ejecuta al cargar sección + botón "Actualizar"

---

#### `renderStockAlerts()` - Tabla de alertas
- **Archivo**: [src/js/admin-stock-alerts.js](src/js/admin-stock-alerts.js#L20)
- **Entrada**: global `lowStockArticles`
- **Salida**: Tabla HTML con colores (rojo/amarillo)
- **Muestra**: Artículo, stock, mínimo, productos que lo usan

---

#### `handleEditStock(article)` - Editar stock (placeholder)
- **Archivo**: [src/js/admin-stock-alerts.js](src/js/admin-stock-alerts.js#L79)
- **Entrada**: artículo
- **Salida**: Prompt para nuevo stock (no implementado totalmente)
- **Estado**: Listo para conectar con Firestore update

---

## 🔗 Flujo de Datos

```
1. Admin crea artículo (Blog)
   └─→ admin-blogs.js: handleSubmit()
       └─→ addCollectionDoc('blogs', {stock, stock_unit, ...})

2. Admin crea producto con artículos (Product)
   └─→ admin-products.js: renderRelatedBlogs()
       └─→ renderRecipeItems() [tabla dinámica]
       └─→ handleSubmit()
           └─→ addCollectionDoc('products', {receta: [...], ...})

3. Sistema detecta orden
   └─→ admin-orders.js: openOrderDetail()
       └─→ Muestra botón "Confirmar y descontar stock"

4. Admin confirma orden
   └─→ handleConfirmOrder()
       └─→ Para cada item:
           └─→ stockService.deductStockFromRecipe(db, productId, qty)
               └─→ stockService.calculateStockDeduction()
               └─→ stockService.validateStockAvailable()
               └─→ updateDoc(blogs, {stock: newStock})
       └─→ updateCollectionDoc('orders', {status: 'confirmed'})

5. Admin revisa alertas
   └─→ admin-stock-alerts.js: loadStockAlerts()
       └─→ stockService.getLowStockArticles()
       └─→ renderStockAlerts()
           └─→ Tabla con colores según urgencia
```

---

## 📊 Global State

### `recipeState` (admin-products.js)
```javascript
let recipeState = [
  {
    articulo_id: "...",
    articulo_nombre: "...",
    cantidad: 500,
    unidad: "gramos",
    stock_unit_original: "gramos"
  }
];
```
- Usado por: `renderRecipeItems()`, `handleSubmit()`
- Actualizado por: checkbox change events

### `lowStockArticles` (admin-stock-alerts.js)
```javascript
let lowStockArticles = [
  { id, title, stock, cantidad_minima, stock_unit, disponible, ... }
];
```
- Usado por: `renderStockAlerts()`
- Actualizado por: `loadStockAlerts()` cada 5 minutos

### `allProducts` (admin-stock-alerts.js)
```javascript
let allProducts = [];  // cache de todos los productos
```
- Usado por: mostrar "Productos que usan" en tabla de alertas

---

## 🎯 Entry Points

### Inicialización (admin.js)
```javascript
import { initStockAlertsSection } from './admin-stock-alerts.js';

document.addEventListener('DOMContentLoaded', async () => {
  await initStockAlertsSection();  // ← Inicia dashboard
});
```

### HTML Triggers
```html
<!-- Blogs: Auto-validación en blur -->
<input name="stock" type="number" />
<input name="cantidad_minima" type="number" />

<!-- Productos: Checkboxes → tabla -->
<input type="checkbox" class="article-selector" />

<!-- Órdenes: Botón confirmar -->
<button id="confirm-order-btn" ...>Confirmar y descontar stock</button>

<!-- Alertas: Auto-carga + refresh manual -->
<button id="btn-refresh-stock-alerts">Actualizar</button>
```

---

## 🧪 Testing Functions

Para probar en consola:

```javascript
// 1. Ver estado de receta actual
console.log(recipeState);

// 2. Calcular descuento sin ejecutar
const deductions = calculateStockDeduction(product, 2);
console.log(deductions);

// 3. Validar stock
const valid = await validateStockAvailable(db, product, 2);
console.log(valid);

// 4. Refrescar alertas manualmente
document.querySelector('#btn-refresh-stock-alerts').click();

// 5. Ver artículos con stock bajo
const low = await getLowStockArticles(db);
console.log(low);
```

---

## 📚 Archivos de Referencia

- **stockService.js**: Toda la lógica de cálculo/validación
- **admin-stock-alerts.js**: Dashboard de alertas
- **admin-blogs.js**: Formulario de artículos (stock)
- **admin-products.js**: Formulario de productos (receta)
- **admin-orders.js**: Integración de descuento en órdenes
- **GUIDE-STOCK-SYSTEM.md**: Guía de usuario
- **TESTING-CHECKLIST.md**: Tests manuales
