export type TicketDocumentType = 'account' | 'kitchen' | 'invoice' | 'delivery';

export interface TicketMetadata {
  readonly documentType: TicketDocumentType;
  readonly orderId: number;
  readonly orderNumber?: number;
  readonly createdAt: string;
  readonly currency: string;
  readonly locale: string;
}

export type TicketSectionType = 
  | 'header' 
  | 'customer' 
  | 'items' 
  | 'totals' 
  | 'payment' 
  | 'notes' 
  | 'footer';

export interface BaseTicketSection {
  readonly id: string;
  readonly type: TicketSectionType;
  readonly title?: string;
}

export interface HeaderSection extends BaseTicketSection {
  readonly type: 'header';
  readonly brandName?: string;
  readonly tagline?: string;
  readonly orderIdentifier: string;
  readonly serviceType?: string;
  readonly tableNumber?: string;
  readonly timestamp: string;
  readonly isKitchenBadge?: boolean;
}

export interface CustomerSection extends BaseTicketSection {
  readonly type: 'customer';
  readonly name: string;
  readonly phone?: string;
}

export interface ModifierItem {
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly total: number;
}

export interface ProductItem {
  readonly id: number;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly total: number;
  readonly note?: string;
  readonly variant?: string;
  readonly modifiers: readonly ModifierItem[];
}

export interface ItemsSection extends BaseTicketSection {
  readonly type: 'items';
  readonly items: readonly ProductItem[];
  readonly showPrices: boolean;
}

export interface TotalEntry {
  readonly key: 'subtotal' | 'tip' | 'discount' | 'total';
  readonly label: string;
  readonly amount: number;
  readonly isHighlighted?: boolean;
}

export interface TotalsSection extends BaseTicketSection {
  readonly type: 'totals';
  readonly entries: readonly TotalEntry[];
}

export interface NotesSection extends BaseTicketSection {
  readonly type: 'notes';
  readonly generalNote?: string;
}

export interface FooterSection extends BaseTicketSection {
  readonly type: 'footer';
  readonly message?: string;
}

export type TicketSection = 
  | HeaderSection 
  | CustomerSection 
  | ItemsSection 
  | TotalsSection 
  | NotesSection 
  | FooterSection;

export interface TicketDocument {
  readonly metadata: TicketMetadata;
  readonly sections: readonly TicketSection[];
}
