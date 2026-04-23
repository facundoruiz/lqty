# 🧪 Guía de Pruebas: Sistema de Artículos con Stock

## Requisitos Previos
- ✅ Aplicación corriendo en `http://localhost:xxxx`
- ✅ Autenticado como admin en panel
- ✅ Firestore conectado y disponible

---

## Test 1: Crear Artículo (Blog) con Stock

### Pasos
1. **Sidebar → Blogs**
2. Clic **"Nuevo blog"**
3. Completa formulario:
   ```
   Título:              "Harina Pura"
   Resumen:            "Harina integral molida"
   Contenido:          "Ideal para panes y masas"
   Imagen:             [cualquiera]
   
   [Sección Gestión de Stock]
   Stock:              1000
   Unidad:             Gramos
   Cantidad Mínima:    250
   Disponible:         ✓ (chequeado)
   
   Publicar:           ✓ (chequeado)
   ```
4. Clic **"Guardar"**

### ✅ Resultado Esperado
- Notificación: "Blog creado."
- Tabla actualiza mostrando "Harina Pura"
- En Firestore: documento `blogs/{id}` tiene campos:
  - `stock: 1000`
  - `stock_unit: "gramos"`
  - `cantidad_minima: 250`
  - `disponible: true`

---

## Test 2: Crear Segundo Artículo

Repite Test 1 pero con:
```
Título:              "Levadura Fresca"
Stock:               50
Unidad:              Unidades
Cantidad Mínima:     10
Disponible:          ✓
```

---

## Test 3: Crear Producto con Receta

### Pasos
1. **Sidebar → Productos → Nuevo producto**
2. Completa básicos:
   ```
   Nombre:       "Pan Integral Casero"
   Precio:       550
   Categoría:    [seleccionar cualquiera]
   Descripción:  "Pan hecho con ingredientes naturales"
   Activo:       ✓
   ```
3. **Sección: Receta (Artículos...)**
   - Selecciona checkbox "Harina Pura"
   - Tabla aparece con:
     - Cantidad: `500` (editable)
     - Unidad: `Gramos` (selector)
   - Clickea checkbox "Levadura Fresca"
   - Tabla actualiza con segunda fila:
     - Cantidad: `100` → **cambiar a `5`**
     - Unidad: `Unidades`
4. Clic **"Guardar"**

### ✅ Resultado Esperado
- Notificación: "Producto creado."
- En Firestore: documento `products/{id}` tiene:
  ```javascript
  receta: [
    {
      articulo_id: "[id-harina]",
      articulo_nombre: "Harina Pura",
      cantidad: 500,
      unidad: "gramos",
      stock_unit_original: "gramos"
    },
    {
      articulo_id: "[id-levadura]",
      articulo_nombre: "Levadura Fresca",
      cantidad: 5,
      unidad: "unidades",
      stock_unit_original: "unidades"
    }
  ]
  ```

---

## Test 4: Verificar Alertas de Stock Bajo

### Pasos
1. **Sidebar → Alertas Stock**
2. Inicial: tabla vacía o con pocas alertas (stock está alto)
3. **Reducir stock manualmente**:
   - Sidebar → Blogs → Editar "Harina Pura"
   - Cambiar Stock a `200` (< 250 mínimo)
   - Clic "Guardar"
4. Volver a **Alertas Stock**
5. Clic **"Actualizar"**

### ✅ Resultado Esperado
- "Harina Pura" aparece en tabla con:
  - Fondo amarillo (warning)
  - Stock: 200
  - Mínimo: 250
  - Productos que lo usan: "Pan Integral Casero"
- Notificación: "⚠️ Stock bajo en: Harina Pura"

---

## Test 5: Simular Orden y Descontar Stock

### Pasos
1. **Crear orden manualmente en Firestore**:
   - Colección `orders` → New document
   - Datos:
     ```javascript
     {
       items: [
         {
           product_id: "[id-pan]",
           title: "Pan Integral Casero",
           quantity: 2,
           price: 550
         }
       ],
       fecha: timestamp,
       cliente: "Test User",
       telefono: "123456789",
       tipo_entrega: "retiro",
       status: "pending",
       stock_deducted: false
     }
     ```
   - Save

2. **Admin → Pedidos**
3. Tabla muestra nueva orden
4. Clic **"Ver"** en la orden
5. Modal abre con:
   - Items: "Pan Integral Casero x 2"
   - Botón: **"Confirmar y descontar stock"**
6. Clic botón

### ✅ Resultado Esperado
- Botón cambia a: "Stock ya descontado" (deshabilitado)
- Notificación: "Orden confirmada. Stock descontado para 1 producto(s)."
- Verificar stocks en Blogs:
  - **Harina Pura**: `200 - (500×2) = 200 - 1000 = 0`
  - **Levadura Fresca**: `50 - (5×2) = 50 - 10 = 40`
- En Firestore `orders/{id}`:
  - `status: "confirmed"`
  - `stock_deducted: true`
  - `confirmed_at: timestamp`

---

## Test 6: Validación de Stock Insuficiente

### Pasos
1. **Blogs**: cambiar "Harina Pura" stock a `100` (insuficiente para 500×2)
2. **Crear nueva orden** (Firestore):
   ```javascript
   {
     items: [
       {
         product_id: "[id-pan]",
         title: "Pan Integral Casero",
         quantity: 3,        // ← 3 panes = 1500g harina (> 100)
         price: 550
       }
     ],
     fecha: timestamp,
     status: "pending"
   }
   ```
3. **Pedidos** → Ver orden
4. Clic **"Confirmar y descontar stock"**

### ✅ Resultado Esperado
- ❌ Error: "Stock insuficiente de "Harina Pura": necesitas 1500 gramos, tienes 100."
- Botón sigue habilitado
- Stock **NO se modifica**

---

## Test 7: Tabla de Receta Dinámica

### Pasos
1. **Productos**: Editar "Pan Integral Casero"
2. Tabla de receta muestra:
   ```
   Artículo          | Cantidad | Unidad    | Acción
   Harina Pura       | 500      | Gramos    | Quitar
   Levadura Fresca   | 5        | Unidades  | Quitar
   ```
3. Clic checkbox "Harina Pura" (desseleccionar)
4. Tabla actualiza: solo "Levadura Fresca"
5. Clic **"Quitar"** en levadura
6. Tabla vacía: "No hay artículos seleccionados"

### ✅ Resultado Esperado
- Tabla se actualiza dinámicamente
- Inputs y selectors son editables
- Cambios **NO se guardan** hasta hacer Submit

---

## Test 8: Validaciones en Tiempo Real

### Pasos
1. **Blogs → Editar "Harina Pura"**
2. Stock: cambiar a `-100`
3. Clic fuera del campo (blur)
4. Campo se resetea a `0`

### ✅ Resultado Esperado
- Campo rechaza valores negativos
- Se resetea a 0 automáticamente

---

## Test 9: Compatibilidad Hacia Atrás

### Pasos
1. En Firestore, editar producto viejo que tenga `related_blogs` (formato antiguo)
2. **Productos**: Editar ese producto
3. Tabla de receta carga artículos del campo antiguo

### ✅ Resultado Esperado
- `related_blogs` se carga y convierte a formato `receta` internamente
- Al guardar, se actualiza a `receta` (nuevo formato)

---

## 🐛 Debugging Checklist

Si algo falla:

### Paso 1: Consola del Navegador
```javascript
// Ver receta en memoria
console.log(recipeState);

// Ver artículos en caché
console.log(cachedBlogs);

// Ver producto actual
console.log(cachedProducts.find(p => p.title === "Pan..."));
```

### Paso 2: Firestore Console
- Verifica que documento tiene campos nuevos
- Estructura de `receta` es array de objetos
- `stock`, `stock_unit` son números/strings

### Paso 3: Network Tab (F12)
- Busca llamadas a `updateDoc`, `getDoc`
- Verificar que las respuestas tienen `stock_deducted: true`

### Paso 4: Errores Comunes
| Problema | Causa | Solución |
|----------|-------|----------|
| Tabla no aparece | No seleccionaste artículos | Checkea al menos uno |
| Stock no descuenta | Producto sin receta | Edita y agrega artículos |
| Botón deshabilitado | Orden ya procesada | Crea nueva orden |
| Cantidad inválida | Entrada no es número > 0 | Limpia y reingresa |

---

## 📊 Resultado Final Esperado

```
ANTES (stock disponible):
- Harina Pura:      1000g
- Levadura Fresca:  50 unidades

DESPUÉS (confirmar orden de 2 panes):
- Harina Pura:      0g (1000 - 500×2)
- Levadura Fresca:  40 unidades (50 - 5×2)

ALERTAS:
- Harina: ✓ En alerta (stock crítico = 0)
- Levadura: ✓ En alerta (40 < 10... espera, no, es > 10, sin alerta)
```

---

## ✅ Todo Completado

Si pasas todos estos tests, el sistema está 100% funcional.

**Próximos pasos opcionales**:
- [ ] Agregar Firestore security rules
- [ ] Crear historial de movimientos
- [ ] Sistema de reorden automático
- [ ] Confirmación bimodal antes de descontar
