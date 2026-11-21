import { TicketDocument } from '../models/ticket-document.model';
import { RenderContext } from '../models/render-context.model';

export interface TicketRenderer<TOutput> {
  render(document: TicketDocument, context?: RenderContext): TOutput;
}
