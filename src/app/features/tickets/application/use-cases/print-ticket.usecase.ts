import { Injectable, inject } from '@angular/core';
import { SupabaseOrderRepository } from '../../infrastructure/repositories/supabase-order.repository';
import { TicketDocumentBuilder } from '../../domain/builders/ticket-document.builder';
import { PrintDestination, PrintProfile } from '../../domain/models/render-context.model';
import { PrintJob, createPrintJob } from '../../domain/models/print-job.model';
import { PrintDispatcher } from '../dispatchers/print.dispatcher';
import { TicketPolicy, CustomerAccountPolicy, KitchenOrderPolicy } from '../../domain/policies/ticket.policy';

export interface PrintTicketOptions {
  policy?: TicketPolicy;
  destination?: PrintDestination;
  profile?: PrintProfile;
  isNative?: boolean;
  copies?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PrintTicketUseCase {
  private orderRepository = inject(SupabaseOrderRepository);
  private dispatcher = inject(PrintDispatcher);

  async execute(orderId: number, options?: PrintTicketOptions): Promise<PrintJob> {
    const isNative = options?.isNative ?? false;
    const destination: PrintDestination = options?.destination ?? (isNative ? 'bluetooth' : 'web');
    const profile: PrintProfile = options?.profile ?? 'pos58';
    const policy = options?.policy ?? CustomerAccountPolicy;

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error(`No se encontró la orden con ID: ${orderId}`);
    }

    const document = TicketDocumentBuilder.build(order, { policy });

    const job = createPrintJob({
      orderId,
      destination,
      profile,
      copies: options?.copies ?? 1,
      document
    });

    return this.dispatcher.dispatch(job);
  }
}
