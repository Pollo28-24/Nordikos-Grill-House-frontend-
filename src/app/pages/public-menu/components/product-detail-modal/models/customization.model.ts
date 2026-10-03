import { Product, ProductVariant, Modifier, ModifierCategory, SelectedModifierItem } from '@core/models/product.model';

export interface PriceBreakdown {
  readonly baseUnitPrice: number;
  readonly modifiersUnitPrice: number;
  readonly totalUnitPrice: number;
  readonly quantity: number;
  readonly finalTotal: number;
}

export interface ValidationIssue {
  readonly id: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly categoryId?: string | number;
  readonly message: string;
  readonly blocking: boolean;
  readonly fixSuggestion?: string;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly blockingMessage?: string;
}

export interface CartCustomization {
  readonly product: Product;
  readonly variant: ProductVariant | null;
  readonly quantity: number;
  readonly modifiers: readonly SelectedModifierItem[];
  readonly note?: string;
  readonly pricing: PriceBreakdown;
}

export interface CustomizationSection {
  readonly id: string;
  readonly title: string;
  readonly type: 'variants' | 'modifier-category' | 'notes';
  readonly isRequired: boolean;
  readonly isComplete: boolean;
  readonly selectionCount: number;
  readonly badgeText?: string;
  readonly data?: any;
}

export interface GroupedCategory {
  readonly category: ModifierCategory;
  readonly items: readonly Modifier[];
}
