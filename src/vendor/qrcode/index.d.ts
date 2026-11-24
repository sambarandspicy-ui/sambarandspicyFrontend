declare class QRCode {
  constructor(typeNumber: number, errorCorrectionLevel: number);
  addData(data: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, column: number): boolean;
}
export = QRCode;
