export interface RenderOutput<T = any> {
  readonly mediaType: 'text/html' | 'application/octet-stream' | 'text/plain' | 'application/pdf';
  readonly payload: T;
}
