import { PrintDestination, PrintProfile } from './render-context.model';
import { TicketDocument } from './ticket-document.model';

export type PrintJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PrintMetrics {
  readonly buildMs?: number;
  readonly renderMs?: number;
  readonly encodeMs?: number;
  readonly transportMs?: number;
  readonly totalMs?: number;
}

export interface PrintJob {
  readonly id: string;
  readonly orderId: number;
  readonly destination: PrintDestination;
  readonly profile: PrintProfile;
  readonly status: PrintJobStatus;
  readonly document?: TicketDocument;
  readonly copies: number;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly createdAt: string;
  readonly error?: string;
  readonly metrics?: PrintMetrics;
}


export function createPrintJob(params: {
  orderId: number;
  destination: PrintDestination;
  profile?: PrintProfile;
  copies?: number;
  document?: TicketDocument;
}): PrintJob {
  return Object.freeze({
    id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    orderId: params.orderId,
    destination: params.destination,
    profile: params.profile ?? 'pos58',
    status: 'pending',
    document: params.document,
    copies: params.copies ?? 1,
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date().toISOString()
  });
}
