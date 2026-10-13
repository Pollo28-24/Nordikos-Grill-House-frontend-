export type LogicalNodeType = 
  | 'header'
  | 'badge'
  | 'keyValue'
  | 'productRow'
  | 'modifierRow'
  | 'totalsRow'
  | 'divider'
  | 'note'
  | 'footer';

export interface BaseLogicalNode {
  readonly id: string;
  readonly type: LogicalNodeType;
}

export interface LogicalHeaderNode extends BaseLogicalNode {
  readonly type: 'header';
  readonly title: string;
  readonly subtitle?: string;
  readonly identifier: string;
  readonly timestamp: string;
}

export interface LogicalBadgeNode extends BaseLogicalNode {
  readonly type: 'badge';
  readonly text: string;
}

export interface LogicalKeyValueNode extends BaseLogicalNode {
  readonly type: 'keyValue';
  readonly label: string;
  readonly value: string;
}

export interface LogicalProductRowNode extends BaseLogicalNode {
  readonly type: 'productRow';
  readonly quantity: number;
  readonly name: string;
  readonly unitPrice?: number;
  readonly total?: number;
  readonly variant?: string;
  readonly note?: string;
}

export interface LogicalModifierRowNode extends BaseLogicalNode {
  readonly type: 'modifierRow';
  readonly name: string;
  readonly quantity: number;
  readonly total?: number;
}

export interface LogicalTotalsRowNode extends BaseLogicalNode {
  readonly type: 'totalsRow';
  readonly label: string;
  readonly amount: number;
  readonly isHighlighted?: boolean;
}

export interface LogicalDividerNode extends BaseLogicalNode {
  readonly type: 'divider';
  readonly style: 'solid' | 'dashed' | 'double';
}

export interface LogicalNoteNode extends BaseLogicalNode {
  readonly type: 'note';
  readonly title?: string;
  readonly content: string;
}

export interface LogicalFooterNode extends BaseLogicalNode {
  readonly type: 'footer';
  readonly message: string;
}

export type LogicalNode = 
  | LogicalHeaderNode 
  | LogicalBadgeNode 
  | LogicalKeyValueNode 
  | LogicalProductRowNode 
  | LogicalModifierRowNode 
  | LogicalTotalsRowNode 
  | LogicalDividerNode 
  | LogicalNoteNode 
  | LogicalFooterNode;

export interface LogicalLayout {
  readonly documentId: string;
  readonly nodes: readonly LogicalNode[];
}
