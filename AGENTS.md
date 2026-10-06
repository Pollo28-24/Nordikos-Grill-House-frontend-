# AGENTS.md — Nórdikos Grill House

Guía de arquitectura, convenciones y directrices para agentes de IA y desarrolladores trabajando en Nórdikos Grill House.

## 1. Visión y Arquitectura General
Sistema omnicanal para restaurante (menú público web + POS interno para comandas, pedidos y tickets).
- **Frontend**: Angular 20.3.17 (Zoneless, Standalone Components, Signals, `resource()` API).
- **Móvil**: Capacitor 8.3.0 (Android con plugin Bluetooth Serial ESC/POS y Filesystem/Share).
- **Backend**: Supabase (PostgreSQL 15+, PostgREST, Auth, Realtime, Storage).
- **Estilos**: Tailwind CSS v4 (`@import "tailwindcss";` con tokens en `@theme` dentro de `src/styles.css`).

## 2. Mapa de Rutas
- `/landing`: Landing page gastronómica (Pública).
- `/menu`: Menú digital interactivo para comensales (Público).
- `/auth/log-in` y `/auth/sign-up`: Acceso al sistema (Público con `publicGuard`).
- `/home`: Dashboard inicial interno y generador de QR (Privado con `privateGuard`).
- `/products`: Catálogo de productos, fotos y variantes (Privado).
- `/categories`: Categorías de menú (Privado).
- `/manageModifiers/categories` y `/manageModifiers/items`: Modificadores y extras (Privado).
- `/orders/new`: Punto de venta (POS) para toma de comandas (Privado).
- `/orders/by-service`: Tablero de comandas activas por canal (Mesa / Llevar / Delivery) (Privado).
- `/orders/requests`: Buzón de recepción de pedidos web para aceptar o rechazar (Privado).
- `/orders/:id`: Detalle y acciones de una comanda (Privado).
- `/sales`: Panel de control de ventas y KPIs financieros (Privado).

## 3. Modelo de Dominio y Datos Clave
- **Productos (`productos`)**: Precios simples o con variantes (`price_type`).
- **Separación de Estados**:
  - `visible`: Controla la exhibición comercial en el Menú Público (`/menu`).
  - `disponible`: Controla la disponibilidad operativa / stock. Si es `false`, se muestra como "Agotado" y no permite venta ni en público ni en POS.
- **Modificadores (`modificadores`)**: Grupos vinculados a productos mediante `producto_modificadores`. Reglas de selección (`RADIO`, `CHECKBOX`, `STEPPER`) y obligatoriedad.
- **Comandas (`orders`)**: Consecutivo diario por fecha. Las líneas (`order_items`) guardan snapshot inmutable de `nombre_producto` y `precio_unitario`.
- **Solicitudes (`order_requests`)**: Pedidos originados por clientes web. Pasan a comanda oficial mediante el RPC `accept_order_request(p_request_id, p_metodo_pago_id, p_turno_id)`.

## 4. Reglas y Convenciones Obligatorias de Código
1. **Zoneless & Signals First**: No usar `toPromise()`, `BehaviorSubject` innecesarios ni Zone.js. Usar `signal`, `computed`, `effect` y `resource()`.
2. **Defensiva SSR**: Toda API del navegador (`localStorage`, `window`, `navigator`, `indexedDB`, Bluetooth) DEBE envolverse con `if (isPlatformBrowser(this.platformId))`.
3. **No mutar objetos con `delete`**: Usar listas blancas o destructuración inmutable para armar payloads de Supabase.
4. **Preservar Snapshot de Precios**: Nunca guardar en ítems de orden solo el ID del producto; siempre persistir `nombre_producto` y `precio_unitario`.
5. **No romper tipado**: `Modifier` requiere `disponible: boolean`. Todo mock en specs debe proveerlo.
6. **Tokens Centralizados**: Usar las variables de `@theme` (`--color-nord-*`) definidas en `src/styles.css`.

## 5. Comandos de Trabajo
- `ng serve`: Inicia servidor local en `http://localhost:4200/`.
- `npm run build`: Compila para producción (Browser + SSR bundles).
- `npx ng test --no-watch --browsers=ChromeHeadless`: Ejecuta pruebas unitarias de Karma.
- `npx cap sync android`: Sincroniza la build web con el proyecto nativo Android.

## 6. Prohibiciones Estrictas
- NUNCA commitear credenciales o claves privadas en `src/environments/`.
- NUNCA realizar borrados en cascada de productos o categorías sin antes verificar si existen órdenes históricas vinculadas.
- NUNCA mezclar las responsabilidades de `visible` (catálogo) y `disponible` (stock).
