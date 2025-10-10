# Temas Disponibles - La que tomo Yo!

Este documento describe los temas estacionales implementados en la aplicación. Actualmente, el tema por defecto es **"default"** (neutral), pero puedes cambiarlo programáticamente según la fecha o preferencias.

## 🎨 Temas Implementados

### 1. **default** (Tema Neutral)
- **Descripción**: Tema base con colores neutros y naturales
- **Colores principales**:
  - Fondo: `#ffffff` (blanco)
  - Texto: `#1b1b1b` (gris oscuro)
  - Primario: `#0e9f6e` (verde natural)
  - Superficie: `#f8fafc` (gris muy claro)
  - Borde: `#e5e7eb` (gris claro)
- **Uso**: Tema por defecto, adecuado para todo el año

### 2. **patrios** (Días Patrios 🇦🇷)
- **Descripción**: Tema patriótico argentino con celeste, blanco y dorado
- **Colores principales**:
  - Fondo: `#ffffff` (blanco)
  - Texto: `#0f172a` (azul oscuro)
  - Primario: `#49a6f2` (celeste argentino)
  - Acabado: `#f2c94c` (dorado)
  - Superficie: `#f0f9ff` (celeste claro)
- **Características especiales**: Patrón sutil de escarapela en el fondo
- **Uso**: Ideal para fechas patrias (25 de mayo, 9 de julio)

### 3. **comerciales** (Fechas Comerciales 🛍️)
- **Descripción**: Tema oscuro para resaltar promociones y ofertas
- **Colores principales**:
  - Fondo: `#0b1020` (azul oscuro)
  - Texto: `#f8fafc` (blanco)
  - Primario: `#22d3ee` (cian brillante)
  - Acabado: `#a78bfa` (violeta)
  - Superficie: `#111827` (gris oscuro)
- **Características especiales**: Gradientes en secciones de hero y promociones
- **Uso**: Perfecto para Hot Sale, Cyber Monday, Black Friday

### 4. **navidad** (Navidad 🎄)
- **Descripción**: Tema festivo con verde pino, rojo y dorado
- **Colores principales**:
  - Fondo: `#fffdf7` (crema)
  - Texto: `#223` (verde oscuro)
  - Primario: `#1a8e4b` (verde pino)
  - Acabado: `#c0392b` (rojo navideño)
  - Superficie: `#fffaf0` (crema claro)
- **Características especiales**: Efecto bokeh con círculos de colores navideños
- **Uso**: Temporada navideña (diciembre)

### 5. **halloween** (Halloween 🎃)
- **Descripción**: Tema oscuro y misterioso con naranja, púrpura y negro
- **Colores principales**:
  - Fondo: `#0d0b12` (negro azulado)
  - Texto: `#f8f7ff` (blanco azulado)
  - Primario: `#ff7a1a` (naranja calabaza)
  - Acabado: `#7e3ff2` (púrpura)
  - Superficie: `#151026` (gris oscuro)
- **Características especiales**: Patrón SVG de murciélagos repetido
- **Uso**: Noche de brujas (31 de octubre)

## 🔧 Cómo Cambiar el Tema

Aunque actualmente no hay selector de usuario, puedes cambiar el tema programáticamente:

### JavaScript (usando theme-switcher.js)
```javascript
import { applyTheme } from './js/theme-switcher.js';

// Cambiar a tema patrios
applyTheme('patrios');

// Cambiar a navidad
applyTheme('navidad');
```

### CSS (atributo data-theme)
```html
<html data-theme="navidad">
```

### Automatización por Fecha
Puedes agregar lógica para cambiar automáticamente según la fecha:

```javascript
// Ejemplo: Cambiar a navidad en diciembre
const month = new Date().getMonth() + 1; // 1-12
if (month === 12) {
  applyTheme('navidad');
} else if (month === 10 && new Date().getDate() >= 31) {
  applyTheme('halloween');
} else if (month === 5 || month === 7) {
  applyTheme('patrios');
} else {
  applyTheme('default');
}
```

## 🎯 Variables CSS Disponibles

Todos los temas usan estas variables CSS para mantener consistencia:

- `--bg`: Color de fondo principal
- `--text`: Color de texto principal
- `--muted`: Color de texto secundario
- `--primary`: Color primario (botones, enlaces)
- `--primary-contrast`: Color de contraste para texto sobre primary
- `--accent`: Color de acento
- `--surface`: Color de superficies (cards, modales)
- `--border`: Color de bordes
- `--sp-1` a `--sp-5`: Espaciado (0.25rem a 2rem)
- `--fs-100` a `--fs-500`: Tamaños de fuente (0.875rem a 1.5rem)
- `--radius-sm/md/lg`: Bordes redondeados
- `--shadow-1/2`: Sombras

## 📱 Accesibilidad

- Todos los temas cumplen con contraste AA mínimo
- Respeta `prefers-reduced-motion` (sin animaciones si el usuario lo prefiere)
- Focus visible mantenido en todos los temas

## 🚀 Próximos Pasos

- Agregar selector de tema en UI si se requiere
- Implementar cambio automático por fecha
- Agregar más temas estacionales (Año Nuevo, Día del Padre/Madre, etc.)
- Optimizar carga (code-splitting por tema si crece mucho)