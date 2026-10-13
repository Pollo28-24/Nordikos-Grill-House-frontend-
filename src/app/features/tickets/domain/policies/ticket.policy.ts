export interface TicketPolicy {
  readonly name: string;
  readonly includeBranding: boolean;
  readonly includePrices: boolean;
  readonly includeTotals: boolean;
  readonly includeFooter: boolean;
  readonly isKitchenBadge: boolean;
  readonly defaultTitle?: string;
}

export const CustomerAccountPolicy: TicketPolicy = Object.freeze({
  name: 'account',
  includeBranding: true,
  includePrices: true,
  includeTotals: true,
  includeFooter: true,
  isKitchenBadge: false
});

export const KitchenOrderPolicy: TicketPolicy = Object.freeze({
  name: 'kitchen',
  includeBranding: false,
  includePrices: false,
  includeTotals: false,
  includeFooter: false,
  isKitchenBadge: true,
  defaultTitle: '*** COCINA ***'
});
