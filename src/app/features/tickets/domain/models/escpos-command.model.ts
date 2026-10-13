export type EscPosCommandType = 
  | 'init'
  | 'align'
  | 'bold'
  | 'doubleSize'
  | 'text'
  | 'feed'
  | 'cut'
  | 'barcode';

export interface BaseEscPosCommand {
  readonly type: EscPosCommandType;
}

export interface InitCommand extends BaseEscPosCommand {
  readonly type: 'init';
}

export interface AlignCommand extends BaseEscPosCommand {
  readonly type: 'align';
  readonly align: 'left' | 'center' | 'right';
}

export interface BoldCommand extends BaseEscPosCommand {
  readonly type: 'bold';
  readonly enabled: boolean;
}

export interface DoubleSizeCommand extends BaseEscPosCommand {
  readonly type: 'doubleSize';
  readonly enabled: boolean;
}

export interface TextCommand extends BaseEscPosCommand {
  readonly type: 'text';
  readonly text: string;
}

export interface FeedCommand extends BaseEscPosCommand {
  readonly type: 'feed';
  readonly lines: number;
}

export interface CutCommand extends BaseEscPosCommand {
  readonly type: 'cut';
  readonly mode: 'full' | 'partial';
}

export interface BarcodeCommand extends BaseEscPosCommand {
  readonly type: 'barcode';
  readonly code: string;
}

export type EscPosCommand = 
  | InitCommand 
  | AlignCommand 
  | BoldCommand 
  | DoubleSizeCommand 
  | TextCommand 
  | FeedCommand 
  | CutCommand 
  | BarcodeCommand;
