export interface Receipt {
  id: string;
  date: Date;
  total: number;
  items: ReceiptItem[];
  vendor: string;
  taxAmount?: number;
}

interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
