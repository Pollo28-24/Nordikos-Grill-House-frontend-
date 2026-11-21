# ADR-009: Arquitectura Final de la Plataforma de Emisión de Tickets

* **Fecha**: 2026-10-13
* **Estado**: Aprobado (Approved)
* **Contexto**: Nórdikos Grill House (Angular 20 / Zoneless / Signals / Capacitor 8 / ESC/POS / jsPDF)
* **Decisores**: Senior Architecture Team & Core Contributors

---

## 1. Contexto y Problema

Durante las primeras fases del sistema, la emisión de comprobantes residía en un servicio monolítico (`ticket.service.ts`) de más de 940 líneas que concentraba la lectura de base de datos Supabase, manipulación directa del DOM de impresión, concatenación manual de bytes ESC/POS, generación de PDFs con jsPDF, enlaces de WhatsApp y administración de la radiofrecuencia y sockets Bluetooth nativos.

Cualquier ajuste de diseño visual ponía en riesgo la conectividad de hardware, y los cambios de esquema en base de datos rompían los tickets térmicos. Se requería una transición arquitectónica radical pero segura mediante **Strangler Fig**, sin interrumpir la operación de los cajeros y mozos.

---

## 2. Decisión Arquitectónica

Se declara el subsistema de tickets como un **Subdominio Documental Autónomo**, estructurado bajo **Clean Architecture / Ports & Adapters** con estricta adherencia a **Single Responsibility Principle (SRP)**.

### Mapa Canónico del Pipeline

```
[Supabase / PostgREST]
         │
         ▼
[SupabaseOrderAssembler (ACL)]
         │
         ▼
  PrintableOrder (Dominio Inmutable)
         │
         ├─────────────────────────────────────────┐
         ▼                                         ▼
   TicketPolicy (Reglas de Negocio)           TicketPolicy
(CustomerAccountPolicy / Pre-cuenta)      (KitchenOrderPolicy / Comanda)
         │                                         │
         └────────────────────┬────────────────────┘
                              ▼
                    TicketDocumentBuilder
                              │
                              ▼
                  TicketDocument (IR Agnóstica)
                              │
        ┌─────────────────────┼─────────────────────┬─────────────────────┐
        ▼                     ▼                     ▼                     ▼
   HtmlTicketRenderer    EscPosTicketRenderer    PdfTicketRenderer   WhatsappTicketRenderer
        │                     │                     │                     │
        ▼                     ▼                     ▼                     ▼
RenderOutput<string>  RenderOutput<string|u8> RenderOutput<Uint8Array>  RenderOutput<string>
        │                     │                     │                     │
        ▼                     ▼                     ▼                     ▼
 WebPrinterAdapter     BluetoothPrinterAdapter   PdfShareAdapter     Capacitor.Share / Web
 (Iframe aislado)       (Socket RFCOMM ESC/POS)  (Filesystem / Native) (Clipboard / Chat)
```

---

## 3. Segregación de Responsabilidades

### A. Capa de Dominio (`src/app/features/tickets/domain/`)
* **`PrintableOrder`**: Modelo inmutable (`Object.freeze`) totalmente desacoplado de las tablas de Supabase. Representa la orden con sus snapshots de precios, modificadores y cliente.
* **`TicketDocument`**: Representación intermedia (IR) estructurada en bloques de secciones semánticas (`header`, `customer`, `items`, `totals`, `payments`, `notes`).
* **`TicketPolicy`**: Políticas puras que dictan qué se imprime y qué se oculta (ej. `KitchenOrderPolicy` enmascara precios, totales y métodos de pago; `CustomerAccountPolicy` muestra el desglose financiero íntegro).

### B. Capa de Aplicación (`src/app/features/tickets/application/`)
* **`PrintTicketUseCase`**: Caso de uso que orquesta la carga de la orden, selección de política según canal, construcción del documento y despacho.
* **`PrintDispatcher`**: Punto de enrutamiento que mapea el destino (`web`, `bluetooth`) con su renderer e inyecta la telemetría de rendimiento (`PrintMetrics`).

### C. Fachadas y Servicios Especializados (`src/app/features/tickets/services/`)
Para proteger a la UI y evitar la dispersión de inyecciones, se crearon dos servicios con ejes de cambio independientes:
1. **`TicketService` (~190 líneas)**: Fachada de aplicación para la UI. Expone métodos de alto nivel (`printTicket`, `shareTicketPDF`, `shareOrCopyTicket`). Cambia únicamente si cambian las reglas documentales o los casos de uso.
2. **`BluetoothDeviceService` (~150 líneas)**: Servicio reactivo con Angular Signals (`isBluetoothConnected`, `connectionState`, `bluetoothDevices`). Gobierna el hardware, sockets seriales y almacenamiento local de la dirección MAC. Cambia únicamente si cambian los drivers, permisos o la plataforma nativa.

### D. Capa de Infraestructura (`src/app/features/tickets/infrastructure/`)
* **Renderers**:
  * `HtmlTicketRenderer`: Genera HTML semántico con diseño moderno.
  * `EscPosTicketRenderer`: Compila a texto térmico y utiliza `EscPosEncoder` con codificación estricta **CP850**.
  * `PdfTicketRenderer`: Genera vectores binarios puros (`Uint8Array`) y carga `jsPDF` de forma diferida (`await import('jspdf')`), encapsulándolo en un Lazy Chunk aislado (~700 KB).
  * `WhatsappTicketRenderer`: Formatea texto monoespaciado optimizado para mensajería.
* **Printers & Adapters**:
  * `WebPrinterAdapter`: Iframe oculto con `@media print` para no bloquear el DOM de la aplicación.
  * `BluetoothPrinterAdapter`: Transporte hacia el hardware nativo Android vía plugin Capacitor/Cordova.
  * `PdfShareAdapter`: Puente agnóstico que convierte el `Uint8Array` a archivo físico nativo o descarga de navegador.

---

## 4. Principios de Diseño y Anti-Patrones Rechazados

Con el fin de evitar la **sobrearquitectura (Over-engineering)**, se rechazó explícitamente la incorporación de:
* ❌ **CommandBus / EventBus**: Innecesarios para una interacción síncrona/reactiva en un POS de un solo usuario activo por terminal.
* ❌ **Mediator / StrategyFactoryFactory**: Angular provee inyección de dependencias (`inject()`) de primer nivel; no se requieren fábricas dinámicas complejas para 4 destinos estables.
* ❌ **PhysicalLayout en HTML/PDF**: Ni HTML ni PDF deben sufrir truncamientos artificiales de 32 columnas o anchos fijos de matriz de puntos; esos pertenecen exclusivamente al canal térmico ESC/POS.

---

## 5. Reglas de Evolución: ¿Cuándo crear un nuevo Renderer?

* **Crear un nuevo Renderer cuando**: Exista un protocolo de destino con semántica física propia (ej. `ZplRenderer` para impresoras de etiquetas Zebra o `EposXmlRenderer` para impresoras Epson de red TCP/IP).
* **NO crear un Renderer cuando**: Solo cambie el estilo cosmético, tipografía o márgenes (usar `RenderContext` y perfiles `pos58` vs `pos80`).

---

## 6. Observabilidad y Monitoreo Operativo (`PrintMetrics`)

Cada trabajo de impresión (`PrintJob`) captura métricas precisas en microsegundos vía `performance.now()`:
```ts
export interface PrintMetrics {
  readonly buildMs?: number;
  readonly renderMs?: number;
  readonly encodeMs?: number;
  readonly transportMs?: number;
  readonly totalMs?: number;
}
```
Esto permite diagnosticar de inmediato en soporte técnico si un retraso en caja se debe a la red, al renderizado o a la conectividad Bluetooth con la impresora.

---

## 7. Garantías de Calidad y Estado Final

* **Compilación**: 0 errores en `tsc --noEmit`.
* **Pruebas Automatizadas**: **82 pruebas unitarias e integración pasando al 100%** (0.22s en Karma ChromeHeadless).
* **Determinismo**: Cobertura completa de branches en políticas, sanitización de caracteres españoles en página de códigos CP850 y validación de streams binarios PDF (`%PDF-`).
