import { PrintProfile } from '../../../domain/models/render-context.model';

export class PosTicketTheme {
  static getStyles(profile: PrintProfile = 'pos58'): string {
    const paperWidth = profile === 'pos80' ? '72mm' : '48mm';
    const pageSize = profile === 'pos80' ? '80mm auto' : '58mm auto';

    return `
      @page {
        margin: 0;
        size: ${pageSize};
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 4px;
        background: #ffffff !important;
        color: #000000 !important;
        font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .ticket {
        margin: 0 auto;
        width: ${paperWidth};
        max-width: ${paperWidth};
        font-size: 12px;
        line-height: 1.25;
        color: black !important;
      }
      .header { text-align: center; margin-bottom: 5px; }
      .brand { font-size: 19px; font-weight: 900; margin: 0; letter-spacing: 1px; }
      .tagline { font-size: 11px; text-transform: uppercase; margin: 0; font-weight: bold; }
      .ticket-header-main { margin: 5px 0; }
      .order-id { font-size: 16px; font-weight: 900; margin: 2px 0; }
      .ticket-label { font-size: 15px; font-weight: 900; margin: 3px 0; letter-spacing: 1px; }
      .timestamp { font-size: 11px; margin: 0; font-weight: bold; }
      .service-type { font-size: 13px; font-weight: 900; margin-top: 3px; text-transform: uppercase; }
      .divider { border-top: 1px dashed black; margin: 5px 0; }
      .client { font-size: 12px; margin: 3px 0; }
      .items { margin: 5px 0; }
      .item-block { margin-bottom: 5px; }
      .item-line { display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; }
      .item-qty { width: 25px; }
      .item-name { flex: 1; padding-right: 5px; }
      .item-total { width: 65px; text-align: right; }
      .modifiers { margin-left: 25px; font-size: 11px; }
      .variant-line { font-weight: 600; margin-top: 1px; }
      .modifier-line { display: flex; justify-content: space-between; }
      .item-note { margin-left: 10px; margin-top: 2px; font-size: 11px; font-style: italic; }
      .general-note { margin: 5px 0; }
      .general-note .note-title { font-size: 12px; font-weight: bold; text-align: center; }
      .general-note .note-content { font-size: 13px; font-weight: bold; text-align: center; margin-top: 2px; }
      .totals { margin: 6px 0; font-size: 12px; }
      .total-line { display: flex; justify-content: space-between; margin: 2px 0; }
      .grand-total { font-size: 16px; font-weight: 900; margin-top: 4px; }
      .footer { text-align: center; margin-top: 8px; font-size: 11px; font-weight: bold; }
      .barcode { letter-spacing: -1px; font-size: 12px; margin-top: 4px; }
    `;
  }
}
