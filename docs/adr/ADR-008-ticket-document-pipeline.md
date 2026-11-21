# ADR-008: Arquitectura Hexagonal y Pipeline de Renderizado de Tickets (Strangler Fig Pattern)

* **Estado**: Aprobado
* **Fecha**: 2026-10-13
* **Autores**: Principal Software Architect (GDE & MVP)
* **Aprobadores**: Equipo Técnico & Arquitectura Nórdikos Grill House

---

## 1. Contexto del Problema

El módulo de impresión y generación de comprobantes de venta (`TicketService`) había crecido históricamente hasta superar las 940 líneas de código, convirtiéndose en un *God Object* con múltiples responsabilidades cruzadas:

1. **Acoplamiento Directo con Persistencia**: Consultas y tipados directos de Supabase dentro de los métodos de formateo visual.
2. **Duplicación de Lógica de Formateo**: Cálculos de ancho de línea (ej. `formatLine32`), alineación de texto y tabulación replicados en `generateTicketText`, `printWebTicket` y `generateEscPosTicket`.
3. **Manejo Manual de Códigos ESC/POS**: Inyección cruda de secuencias de escape hexadecimales (`\x1b\x40`, `\x1b\x61`) mezclada con lógica de negocio y concatenaciones de strings.
4. **Corrupción de Caracteres en Hardware Térmico**: Problemas con caracteres acentuados en español (`á, é, í, ó, ú, ñ, Ñ, ¿, ¡`) al no existir una capa formal de codificación de páginas de caracteres (CP850 / PC850).
5. **Riesgo en Producción**: Cualquier cambio en un ticket afectaba simultáneamente la vista previa HTML, el ticket de cocina y la impresora Bluetooth del POS, con alta fragilidad ante regresiones.

---

## 2. Decisión Arquitectónica

Se decide refactorizar el subsistema aplicando **Arquitectura Hexagonal (Ports & Adapters)**, **Domain-Driven Design (DDD)** y el patrón **Strangler Fig (Higuera Estranguladora)** para migrar el módulo de manera iterativa sin interrumpir las operaciones activas del restaurante.

```text
                               ┌────────────────────────────────────────────────────────┐
                               │                    DOMINIO PURO                        │
                               │                                                        │
┌──────────────────┐           │  ┌──────────────────┐           ┌───────────────────┐  │
│ PrintableOrder   │───────────┼─▶│ TicketPolicy     │──────────▶│ TicketDocument    │  │
│ (Entidad Raíz)   │           │  └──────────────────┘           │ (IR Jerárquica)   │  │
└──────────────────┘           │            │                    └─────────┬─────────┘  │
                               │            ▼                              │            │
                               │  ┌──────────────────┐                     │            │
                               │  │ DocBuilder       │─────────────────────┘            │
                               │  └──────────────────┘                                  │
                               └─────────────────────────┬──────────────────────────────┘
                                                         │
                                 ┌───────────────────────┴───────────────────────┐
                                 ▼                                               ▼
                      ┌────────────────────┐                          ┌────────────────────┐
                      │ HtmlTicketRenderer │                          │ EscPosTicket       │
                      │ (Canal Web/Papel)  │                          │ Renderer (Hardware)│
                      └─────────┬──────────┘                          └─────────┬──────────┘
                                │                                               │
                                ▼                                               ▼
                      RenderOutput<string>                            ┌────────────────────┐
                                │                                     │ EscPosEncoder      │
                                ▼                                     │ (CP850 / Binario)  │
                      ┌────────────────────┐                          └─────────┬──────────┘
                      │ WebPrinterAdapter  │                                    │
                      │ (Headless Iframe)  │                                    ▼
                      └────────────────────┘                          RenderOutput<string>
                                                                                │
                                                                                ▼
                                                                      ┌────────────────────┐
                                                                      │ BluetoothAdapter   │
                                                                      │ (Capacitor Serial) │
                                                                      └────────────────────┘
```

### 2.1 Principios de Diseño

1. **Separación de Responsabilidades (Single Responsibility Principle)**:
   * **Extracción de Datos**: `PrintableOrderRepository` (Puerto) / `SupabaseOrderRepository` (Adaptador).
   * **Reglas de Composición**: `TicketPolicy` (`CustomerAccountPolicy`, `KitchenOrderPolicy`).
   * **Construcción del Documento**: `TicketDocumentBuilder` que produce un árbol inmutable `TicketDocument`.
   * **Transformación Visual**: `TicketRenderer<T>` para cada medio.
   * **Codificación de Hardware**: `EscPosEncoder` independiente para serialización binaria y tabla de caracteres.
   * **Transporte Físico**: `Printer<T>` (`WebPrinterAdapter`, `BluetoothPrinterAdapter`).
2. **Distinción entre Destino y Perfil Físico**:
   * `PrintDestination`: `'web' | 'bluetooth' | 'whatsapp' | 'pdf'`. Representa *dónde* o *hacia qué canal* va el documento.
   * `PrintProfile`: `'pos58' | 'pos80' | 'a4'`. Representa la *geometría física* (ancho de papel, columnas imprimibles).
3. **Rechazo de Doble IR Innecesario para Canales Fluidos**:
   * `PhysicalLayout` (columnas fijas, feeds y corte) es exclusivo de canales térmicos monospaced (`ESC/POS`). Canales como HTML, WhatsApp y PDF consumen directamente `TicketDocument`.
4. **Anti-Corruption Layer (ACL)**:
   * `LegacyTicketMapper`: Convierte bidireccionalmente entre el modelo heredado de la UI (`TicketData`) y el nuevo modelo puro de dominio (`PrintableOrder`), garantizando retrocompatibilidad absoluta.

---

## 3. Estrategia de Migración (Strangler Fig)

Se evitó una reescritura masiva de tipo "Big Bang". En su lugar:
1. Se construyó el núcleo de dominio y puertos en paralelo.
2. Se reemplazó la generación de texto (`WhatsApp`) manteniendo la firma pública de `shareOrCopyTicket()`.
3. Se migró la impresión HTML (`printWebTicket()` / `printTicket()`) encapsulando la invocación de `HtmlTicketRenderer` y `WebPrinterAdapter`.
4. Se migró la impresión térmica Bluetooth (`generateEscPosTicket()` / `printTicketBluetooth()`) usando `EscPosTicketRenderer` y `EscPosEncoder`.
5. Se migró el canal PDF (`shareTicketPDF()`) mediante `PdfTicketRenderer` (generación vectorial in-memory retornando `RenderOutput<Uint8Array>`) y `PdfShareAdapter` (aislando el I/O de Capacitor y navegador). Se optimizó el bundle de producción aislando `jsPDF` en un *Lazy Chunk* (`~700 KB`) que no impacta el arranque.
6. Se conservó `TicketService` como fachada delgada, reduciendo su tamaño de 940 a **390 líneas** (más de 550 líneas de deuda técnica podadas), manteniendo retrocompatibilidad total para la UI y reservando el servicio únicamente a la orquestación y estado Bluetooth (`Signals`).

---

## 4. Observabilidad Operativa (`PrintMetrics`)

En un entorno de punto de venta (POS) crítico, la resiliencia operativa depende de diagnosticar con precisión los cuellos de botella de hardware versus compilación. Se instrumentó telemetría nativa en `PrintJob` y `PrintDispatcher`:

* **`renderMs`**: Tiempo de procesamiento y formateo del documento.
* **`transportMs`**: Tiempo consumido por el driver físico (Bluetooth Serial o Headless Iframe).
* **`totalMs`**: Duración total del ciclo de despacho.

Esto permite auditar si una demora de 3 segundos en caja proviene de lentitud en la conexión serial de la impresora o de la generación del ticket.

---

## 5. Consecuencias y Beneficios

### Positivas
* **Separación Estricta de Responsabilidades (SRP)**: Segregación total entre la administración de hardware reactivo (`BluetoothDeviceService`) y la orquestación documental de la UI (`TicketService` como fachada pura).
* **Testabilidad 100% Desacoplada**: El dominio, políticas, builders, encoders y renderers se prueban con fixtures puros de TypeScript sin necesidad de Angular `TestBed`, emuladores de Android ni mocks de Supabase.
* **Red de Contención E2E**: 82 pruebas automatizadas (unitarias e integración) con determinismo absoluto en el marcado HTML, buffers binarios ESC/POS y flujos vectoriales PDF.
* **Soporte Dinámico de Perfiles**: Cambio transparente entre impresoras térmicas de 58mm (32 columnas) y 80mm (42/48 columnas).
* **Robustez en Caracteres Especiales**: Codificación rigurosa a página de códigos CP850 para tickets legibles en cualquier impresora térmica.
* **Cero Mutaciones**: Toda la estructura de datos es inmutable vía `Object.freeze()`.
* **Zero Runtime Overhead**: Los canales digitales (HTML, WhatsApp, PDF) no pagan el costo de layouts de columnas físicas fijas innecesarias.

### Trade-offs y Mitigaciones
* **Mayor Cantidad de Clases y Archivos**: Mitigado mediante convenciones limpias de empaquetado (`domain/`, `application/`, `infrastructure/`).
* **Costo de Adaptación**: Requirió mapeadores (`LegacyTicketMapper`), el cual será deprecado cuando toda la UI pase a consumir `PrintableOrder` en la versión final.

