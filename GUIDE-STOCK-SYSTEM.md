## Guía Rápida: Sistema de Artículos con Gestión de Stock

### 📍 Ubicación de Funciones Principales

#### **Crear/Editar Artículos**
- Archivo: [admin-blogs.js](admin-blogs.js)
- Formulario HTML: [admin.html](admin.html#L260-L290) (fieldset "Gestión de Stock")
- Campos: `stock`, `stock_unit`, `cantidad_minima`, `disponible`

#### **Crear/Editar Productos con Receta**
- Archivo: [admin-products.js](admin-products.js)
- Funciones: `renderRecipeItems()`, `renderRelatedBlogs()`
- Estructura guardada: `product.receta` (array de artículos con cantidad)

#### **Servicio de Stock**
- Archivo: [stockService.js](../services/stockService.js)
- Funciones clave:
  - `calculateStockDeduction(product, qty)` → calcula descuentos
  - `validateStockAvailable(db, product, qty)` → valida suficiencia
  - `deductStockFromRecipe(db, productId, qty)` → descuenta automáticamente
  - `getLowStockArticles(db)` → obtiene alertas

#### **Órdenes y Confirmación**
- Archivo: [admin-orders.js](admin-orders.js)
- Función: `handleConfirmOrder(orderId, orderIndex)`
- Botón: "Confirmar y descontar stock" (aparece en modal de orden)

#### **Dashboard de Alertas**
- Archivo: [admin-stock-alerts.js](admin-stock-alerts.js)
- Sección: "Alertas Stock" (sidebar)
- Auto-actualiza cada 5 minutos

---

### 🔧 Cómo Usar

#### **Caso 1: Agregar un Nuevo Artículo (Harina)**
1. **Admin → Blogs → Nuevo blog**
2. Completa:
   - Título: "Harina Premium"
   - Resumen: "Harina para pan"
   - Contenido: "[descripción técnica]"
   - Stock: `1000`
   - Unidad: `Gramos`
   - Cantidad Mínima: `200`
   - Disponible: ✓ (chequeado)
3. Clic **Guardar**

#### **Caso 2: Crear un Producto (Pan) que Usa Artículos**
1. **Admin → Productos → Nuevo producto**
2. Completa datos básicos
3. **Receta (Artículos que conforman este producto)**:
   - Selecciona: "Harina Premium" → cantidad `500` → unidad `Gramos`
   - Selecciona: "Levadura Fresca" → cantidad `5` → unidad `Unidades`
4. Clic **Guardar**

```
Resultado: Pan Integral = 500g Harina + 5 Levadura
```

#### **Caso 3: Confirmar Orden y Descontar Stock**
1. **Admin → Pedidos → Ver** (orden)
2. Modal muestra items: "Pan Integral x 2"
3. Clic **Confirmar y descontar stock**
4. Sistema descuenta:
   - Harina: 1000g (500 × 2)
   - Levadura: 10 unidades (5 × 2)
5. Orden marca como `confirmed`

#### **Caso 4: Ver Alertas de Stock Bajo**
1. **Admin → Alertas Stock**
2. Tabla muestra artículos donde `stock ≤ cantidad_minima`
3. Colores:
   - 🔴 Rojo = stock 0 (crítico)
   - 🟡 Amarillo = stock bajo

---

### 📊 Estructura de Datos en Firestore

#### **Colección: `blogs` (Artículos)**
```javascript
{
  id: "harina-123",
  title: "Harina Premium",
  content: "...",
  stock: 200,              // ← NUEVO
  stock_unit: "gramos",    // ← NUEVO
  cantidad_minima: 200,    // ← NUEVO
  disponible: true,        // ← NUEVO
  es_articulo: true,       // ← NUEVO
  status: "published",
  created_at: timestamp,
  updated_at: timestamp
}
```

#### **Colección: `products` (Productos)**
```javascript
{
  id: "pan-integral-456",
  title: "Pan Integral",
  receta: [                 // ← CAMBIADO (antes: related_blogs)
    {
      articulo_id: "harina-123",
      articulo_nombre: "Harina Premium",
      cantidad: 500,
      unidad: "gramos",
      stock_unit_original: "gramos"
    },
    {
      articulo_id: "levadura-789",
      articulo_nombre: "Levadura Fresca",
      cantidad: 5,
      unidad: "unidades",
      stock_unit_original: "unidades"
    }
  ],
  price: 450,
  active: true,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### **Colección: `orders` (Órdenes)**
```javascript
{
  id: "order-555",
  items: [
    {
      product_id: "pan-integral-456",
      title: "Pan Integral",
      quantity: 2,
      price: 450
    }
  ],
  status: "confirmed",       // ← Al confirmar
  stock_deducted: true,      // ← Al descontar
  confirmed_at: timestamp,
  fecha: timestamp
}
```

---

### ⚠️ Validaciones Automáticas

| Validación | Dónde | Acción |
|-----------|-------|--------|
| stock ≥ 0 | Blog form (blur) | Resetea a 0 si negativo |
| cantidad_minima ≥ 0 | Blog form (blur) | Resetea a 0 si negativo |
| cantidad en receta > 0 | Producto submit | Rechaza orden |
| stock suficiente | Orden confirm | Rechaza con mensaje |
| stock ≤ min | Alertas (auto) | Notificación visual |

---

### 🐛 Debugging

#### **Stock no se descuenta?**
1. Abre Consola (F12)
2. Busca logs: `deductStockFromRecipe`
3. Verifica:
   - ¿Producto tiene receta?
   - ¿Artículos existen en blogs?
   - ¿Stock es suficiente?

#### **No aparece botón "Confirmar"?**
1. Asegurate que orden está en estado `pending`
2. Verifica que admin-orders.js está importando stockService

#### **Tabla de receta no se muestra?**
1. Asegurate que seleccionaste artículos (checkboxes)
2. Abre consola: `recipeState` debe tener items
3. Recarga página si falla

---

### 📞 Funciones de Utilidad

#### **Calcular descuentos sin ejecutar**
```javascript
// En consola del navegador
const product = { receta: [...] };
const qty = 2;
// Necesitas importar:
// import { calculateStockDeduction } from './services/stockService.js'
```

#### **Forzar actualización de alertas**
```javascript
// En consola
document.querySelector('#btn-refresh-stock-alerts').click();
```

#### **Ver artículos con stock bajo**
```javascript
// En Firestore Console
// Query: blogs donde stock <= cantidad_minima
```

---

### 💾 Backups / Rollback

Si necesitas revertir cambios a Firestore:
1. **Backups automáticos** con Firestore (Cloud Firestore mantiene versiones)
2. **Revert manual**: editar documento y cambiar `stock` al valor anterior
3. **Revert receta**: volver a campo `related_blogs` antiguo (si aplica)

---

### ✅ Checklist de Implementación

- [x] Campos de stock en blogs
- [x] Estructura de receta en productos
- [x] Descuento automático de stock
- [x] Validación de suficiencia
- [x] Dashboard de alertas
- [x] Integración con órdenes
- [x] Estilos CSS
- [x] Mensajes de error
- [ ] Firestore security rules (PENDIENTE)
- [ ] Historial de movimientos (PENDIENTE)

---

### 📚 Archivo de Referencia Completo

Ver `implementation-summary.md` para más detalles técnicos.
