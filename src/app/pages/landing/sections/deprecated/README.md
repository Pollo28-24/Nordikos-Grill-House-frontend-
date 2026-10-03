# Deprecated Landing Sections

Estas secciones fueron retiradas y archivadas durante la ejecución de **ADR-007**: *Rediseño Landing Nórdikos Grill House — Dark Fire Luxury Experience*.

* **Fecha de archivo**: Octubre 2026
* **Arquitectura de referencia**: Angular 20 Standalone Components
* **Motivo**: Redundancia visual/conceptual y optimización del embudo de conversión gastronómico (CRO).

## Secciones archivadas:
1. **`why-us/`**: Su contenido y pilares de calidad fueron absorbidos y sintetizados dentro de `experience/` (*Los 3 Pilares del Fuego*).
2. **`values/`**: Valores abstractos sustituidos por la sección de storytelling artesanal en `about/`.
3. **`stats/`**: Métricas tipo dashboard de software (+8 años, 100% artesanales) integradas de forma orgánica en la narrativa editorial de `about/`.
4. **`mission-values/`**: Versión previa ya en desuso.

> **Nota**: Este directorio se mantiene exclusivamente con fines de trazabilidad y rollback seguro. No se debe importar ningún componente de esta carpeta en `landing.ts` ni en producción.
