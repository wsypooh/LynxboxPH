export interface Building {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  currentElectricityRate: number;
  vatRate: number;
  withholdingTaxRate: number;
  waterRate: number;
  defaultFixedWaterAmount: number;
  penaltyRate: number;
  earlyPaymentDiscountRate: number;
  earlyPaymentDays: number;
  createdAt: string;
  updatedAt: string;
}

export type BuildingInput = Omit<Building, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;

export interface TenantContract {
  startDate: string;
  endDate: string;
  rentAmount: number;
  deposit: number;
  notes?: string;
}

export type WaterMode = 'metered' | 'fixed' | 'direct';
export type ElectricityMode = 'metered' | 'direct';
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'printed';

export interface StatusChange {
  from: InvoiceStatus;
  to: InvoiceStatus;
  changedAt: string;
  changedBy: string;
}

export interface Tenant {
  id: string;
  tenantCode: string;
  ownerId: string;
  buildingId: string;
  floor: string;
  roomNumber: string;
  area: number;
  lesseeName: string;
  contactEmail?: string;
  contactPhone?: string;
  tin?: string;
  defaultRent: number;
  vatEnabled: boolean;
  withholdingTaxEnabled: boolean;
  electricityMode: ElectricityMode;
  waterMode: WaterMode;
  defaultWaterRate?: number;
  defaultFixedWater?: number;
  defaultGuard?: number;
  penaltyEnabled: boolean;
  status: 'active' | 'inactive';
  contracts: TenantContract[];
  createdAt: string;
  updatedAt: string;
}

export type TenantInput = Omit<Tenant, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'tenantCode' | 'electricityMode'> & {
  tenantCode?: string;
  electricityMode?: ElectricityMode;
};

export interface WaterCharge {
  mode: WaterMode;
  presentReading?: number;
  previousReading?: number;
  rate?: number;
  amount: number;
}

export interface ElectricityCharge {
  mode?: ElectricityMode;
  presentReading: number;
  previousReading: number;
  rate: number;
  amount: number;
}

export interface OtherCharge {
  description: string;
  amount: number;
}

export type PaymentMethod = 'cash' | 'check' | 'gcash' | 'credit_card' | 'bank' | 'online_banking';

export interface Payment {
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  note?: string;
}

export interface PreviousBalanceEntry {
  invoiceNumber: string;
  billingMonth: string;
  billingLabel: string;
  amountDue: number;
  amountPaid: number;
  outstanding: number;
  penalty: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  ownerId: string;
  tenantId: string;
  buildingId: string;
  buildingName: string;
  buildingAddress: string;
  buildingPhone: string;
  buildingEmail?: string;
  tenantCode: string;
  lesseeName: string;
  floor: string;
  roomNumber: string;
  billingMonth: string;
  billingLabel: string;
  rent: number;
  vat: number;
  withholdingTax: number;
  water: WaterCharge;
  electricity: ElectricityCharge;
  guard: number;
  otherCharges: OtherCharge[];
  discount: number;
  subtotal: number;
  currentChargesTotal: number;
  previousBalance: number;
  totalDue: number;
  amountPaid: number;
  outstanding: number;
  payments: Payment[];
  previousBalanceHistory: PreviousBalanceEntry[];
  status: InvoiceStatus;
  statusHistory: StatusChange[];
  createdAt: string;
  updatedAt: string;
}

export type InvoiceInput = Omit<Invoice, 'id' | 'invoiceNumber' | 'ownerId' | 'subtotal' | 'currentChargesTotal' | 'totalDue' | 'amountPaid' | 'outstanding' | 'payments' | 'status' | 'createdAt' | 'updatedAt'>;
