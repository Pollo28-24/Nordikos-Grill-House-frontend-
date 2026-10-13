export type PrintDestination = 'web' | 'bluetooth' | 'whatsapp' | 'pdf';
export type PrintProfile = 'pos58' | 'pos80' | 'a4';

export interface RenderBranding {
  readonly brandName?: string;
  readonly tagline?: string;
  readonly logoUrl?: string;
  readonly footerMessage?: string;
}

export interface RenderContext {
  readonly destination: PrintDestination;
  readonly profile: PrintProfile;
  readonly widthCharacters?: number;
  readonly locale?: string;
  readonly currency?: string;
  readonly branding?: RenderBranding;
  readonly showCutCommand?: boolean;
}

export const DEFAULT_RENDER_CONTEXT: RenderContext = {
  destination: 'web',
  profile: 'pos58',
  widthCharacters: 32,
  locale: 'es-MX',
  currency: 'MXN',
  branding: {
    brandName: 'Nórdicos',
    tagline: 'Grill House',
    footerMessage: '¡Gracias por su preferencia!'
  },
  showCutCommand: true
};
