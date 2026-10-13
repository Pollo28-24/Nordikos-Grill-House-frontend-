import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PrinterPort } from '../../domain/ports/printer.port';
import { RenderOutput } from '../../domain/models/render-output.model';

@Injectable({
  providedIn: 'root'
})
export class WebPrinterAdapter implements PrinterPort<RenderOutput<string> | string> {
  private platformId = inject(PLATFORM_ID);

  async print(output: RenderOutput<string> | string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const htmlContent = typeof output === 'string' ? output : output.payload;

    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';

      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        resolve();
        return;
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          resolve();
        }, 1500);
      }, 250);
    });
  }
}
