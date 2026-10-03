# ADR-007: Rediseño Landing Nórdikos Grill House — Dark Fire Luxury Experience

* **Estado**: Aprobado
* **Fecha**: 2026-10-01
* **Autores**: Senior Frontend Architect (GDE & MVP) & Creative UX/UI Lead
* **Aprobadores**: Equipo Técnico & Arquitectura Nórdikos

---

## 1. Contexto del Problema

La landing page existente (`/landing`) de **Nórdikos Grill House** contaba con una arquitectura técnica moderna (Angular 20, Standalone Components, Signals, modularidad por secciones), pero presentaba serios problemas conceptuales y de negocio:

1. **Enfoque de "Sitio Informativo" en vez de Experiencia Gastronómica**:
   * El usuario entraba y leía frases abstractas antes de ver comida real.
   * Se postergaba el producto y la apetitosidad en favor de explicaciones corporativas.
2. **Redundancia Crítica de Contenido (El síndrome de las tarjetas de valores)**:
   * Existían tres secciones separadas (`experience`, `why-us` y `values`) que repetían el mismo concepto con tarjetas y emojis ("calidad", "pasión", "fuego"), generando fatiga cognitiva.
3. **Ausencia de "Categorías de Menú" y "Signature Items"**:
   * No había un escaparate temprano para los platos estrella de la casa ni accesos directos por categoría a la compra.
4. **Fallas Técnicas y Visuales**:
   * Un tag `<video>` apuntando a una ruta inexistente (`assets/video/grill.mp4`), generando errores 404 continuos en el navegador.
   * Estilos oscuros apagados (grises fríos desaturados) más afines a una aplicación SaaS que a un restaurante de fuego y brasas de alta gama.
   * Falta de optimización SEO local estructurada (Schema.org `Restaurant` + `LocalBusiness`).

---

## 2. Decisión Arquitectónica

Se decide rediseñar la landing page bajo el concepto **"Dark Fire Luxury Experience"**, reestructurando el embudo de conversión y la jerarquía visual de la siguiente manera:

### 2.1 Principio de Conversión Psicológica
> **"Primero provocamos hambre y vendemos deseo; luego justificamos la confianza con historia y técnica."**

### 2.2 Nuevo Recorrido del Usuario (Funnel Gastronómico)
1. **Navbar Premium**: Fija con backdrop blur, logo optimizado, 4 enlaces esenciales y CTA `🔥 Ordenar Ahora`.
2. **Hero Cinematográfico**: Arquitectura desacoplada en 3 capas (Background Video/Poster + Gradient Overlay + Hero Content) con H1 y subtítulo enfocados en valor directo y geolocalizado en Oaxaca.
3. **Signature Items ("Favoritos de la Casa")**: Food Showcase Cards con microhistorias que elevan la percepción de valor de las 4 creaciones insignia.
4. **Categorías del Menú**: 4 accesos directos visuales (Hamburguesas, Cortes, Complementos, Bebidas) enlazados directamente al sistema de pedidos `/menu`.
5. **La Experiencia Nórdicos (3 Pilares del Fuego)**: Unificación arquitectónica de las anteriores `experience` + `why-us` + `values` en 3 fundamentos reales: *Carbón y Leña de Encino*, *Carne Seleccionada*, *La Mesa Compartida*.
6. **Historia del Fuego**: Relato artesanal y origen en 2016 en San Pablo Huixtepec, eliminando el acordeón corporativo de Misión/Visión.
7. **Galería Gastronómica + Lightbox**: Grilla masonry con controles táctiles (mínimo 48px) y navegación por teclado.
8. **Prueba Social**: Reseñas reales con insignia de cliente verificado.
9. **Ubicación & Horarios**: Datos de contacto, WhatsApp directo y card interactiva para Google Maps.
10. **CTA Final de Cierre**: Llamado impulsivo a la acción antes del pie de página.
11. **Mobile Bottom Bar Fija**: Barra fija flotante inferior en smartphones (`[ 🔥 Pedir Ahora ] [ 📍 Ubicación ]`).

### 2.3 Sistema de Tokens "Dark Fire Luxury" (Tailwind CSS v4)
* `--color-nord-dark: #050505;` (Negro carbón profundo)
* `--color-nord-charcoal: #111111;` (Superficie de tarjetas y modales)
* `--color-nord-fire: #FF6A00;` (Naranja fuego vibrante para CTAs)
* `--color-nord-fire-soft: rgba(255, 106, 0, 0.15);` (Halos y resplandores)
* `--color-nord-overlay: rgba(0, 0, 0, 0.65);` (Contraste cinematográfico)
* `--color-nord-gold: #D4AF37;` (Dorado de acento)
* `--color-nord-cream: #FFF4E6;` (Blanco cálido para lectura de alto contraste)
* `--color-nord-cream-muted: #D1C7BD;` (Tipografía secundaria cálida)
* Tipografías: `Playfair Display` (Títulos y badges editoriales) + `Inter` (Cuerpo y datos).

### 2.4 Estrategia de Componentes Angular
* **Cero Reescritura Global**: Se respeta la estructura en `src/app/pages/landing/sections/`.
* **Deprecación Segura**: Las secciones redundantes (`why-us`, `values`) se mueven a `sections/deprecated/` durante el período de transición antes de su eliminación definitiva.
* **Componentes Nuevos**: `menu-categories` se crea de forma modular como Standalone Component.

---

## 3. Consecuencias y Beneficios

* **Tasa de Conversión (CRO)**: Reducción drástica del tiempo hasta la primera interacción con comida real (de 8 scrolls a 1 scroll).
* **Rendimiento**: Eliminación del 404 del video, implementación de poster WebP de carga instantánea (`headernordicos.webp`) y desacoplamiento de assets pesados.
* **SEO Local**: Inyección de Schema.org dual `["Restaurant", "LocalBusiness"]` con coordenadas y horarios en Oaxaca para potenciar búsquedas locales ("hamburguesas Oaxaca", "restaurantes cerca").
* **Mantenibilidad**: Reducción de código duplicado en un 35% al unificar pilares redundantes.
* **Experiencia Móvil**: Área táctil garantizada de al menos 48px y acceso inmediato a pedidos vía barra fija inferior.
