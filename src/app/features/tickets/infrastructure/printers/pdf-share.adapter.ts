import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { LoggerService } from '@core/services/logger.service';
import { RenderOutput } from '../../domain/models/render-output.model';

@Injectable({
  providedIn: 'root'
})
export class PdfShareAdapter {
  private platformId = inject(PLATFORM_ID);
  private logger = inject(LoggerService);

  /**
   * Comparte el archivo PDF usando el Share Sheet nativo (móvil)
   * o Web Share / descarga directa en navegador.
   */
  async share(output: RenderOutput<Uint8Array>, filename: string): Promise<'shared' | 'saved' | 'failed'> {
    if (!isPlatformBrowser(this.platformId)) return 'failed';

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const fileUri = await this.saveNative(output.payload, filename);
        const { Share } = await import('@capacitor/share');

        await Share.share({
          title: filename,
          url: fileUri,
          dialogTitle: 'Enviar o Guardar Ticket PDF'
        });

        return 'shared';
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return 'shared';
        }
        this.logger.error('Error al compartir PDF nativo', err, 'PdfShareAdapter');
        throw err;
      }
    }

    // Flujo Navegador Web
    try {
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        const blob = new Blob([output.payload as any], { type: 'application/pdf' });
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: filename,
            files: [file]
          });
          return 'shared';
        }
      }

      // Fallback a descarga web
      await this.download(output, filename);
      return 'saved';
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return 'shared';
      }
      this.logger.warn('Fallo al compartir via Web Share, descargando archivo', err, 'PdfShareAdapter');
      await this.download(output, filename);
      return 'saved';
    }
  }

  /**
   * Fuerza la descarga directa del PDF en el navegador o persistencia local.
   */
  async download(output: RenderOutput<Uint8Array>, filename: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    if (Capacitor.isNativePlatform()) {
      await this.saveNative(output.payload, filename);
      return;
    }

    const blob = new Blob([output.payload as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Guarda los bytes del PDF en el almacenamiento local / caché.
   * Retorna la URI del archivo guardado.
   */
  async save(output: RenderOutput<Uint8Array>, filename: string): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) return '';

    if (Capacitor.isNativePlatform()) {
      return this.saveNative(output.payload, filename);
    }

    await this.download(output, filename);
    return filename;
  }

  private async saveNative(bytes: Uint8Array, filename: string): Promise<string> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const base64Data = this.uint8ArrayToBase64(bytes);

    const writeResult = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache
    });

    return writeResult.uri;
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
