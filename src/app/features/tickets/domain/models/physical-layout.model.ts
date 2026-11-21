export type PhysicalNodeType = 
  | 'text'
  | 'twoColumn'
  | 'line'
  | 'feed'
  | 'cut'
  | 'barcode';

export interface BasePhysicalNode {
  readonly type: PhysicalNodeType;
}

export interface TextNode extends BasePhysicalNode {
  readonly type: 'text';
  readonly text: string;
  readonly align: 'left' | 'center' | 'right';
  readonly bold?: boolean;
  readonly size?: 'normal' | 'double' | 'title';
}

export interface TwoColumnNode extends BasePhysicalNode {
  readonly type: 'twoColumn';
  readonly left: string;
  readonly right: string;
  readonly width: number;
  readonly bold?: boolean;
  readonly fillChar?: string;
}

export interface LineNode extends BasePhysicalNode {
  readonly type: 'line';
  readonly char: string;
  readonly count: number;
}

export interface FeedNode extends BasePhysicalNode {
  readonly type: 'feed';
  readonly lines: number;
}

export interface CutNode extends BasePhysicalNode {
  readonly type: 'cut';
  readonly mode: 'full' | 'partial';
}

export interface BarcodeNode extends BasePhysicalNode {
  readonly type: 'barcode';
  readonly code: string;
}

export type PhysicalNode = 
  | TextNode 
  | TwoColumnNode 
  | LineNode 
  | FeedNode 
  | CutNode 
  | BarcodeNode;

export interface PhysicalLayout {
  readonly widthCharacters: number;
  readonly nodes: readonly PhysicalNode[];
}
