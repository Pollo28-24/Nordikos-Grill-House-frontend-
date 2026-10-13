export interface PrinterPort<T = any> {
  print(output: T): Promise<void>;
}
