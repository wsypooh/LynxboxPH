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
  id?: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  deposit: number;
  notes?: string;
}

export type WaterMode = 'metered' | 'fixed' | 'direct';
export type ElectricityMode = 'metered' | 'direct';
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'printed' | 'void';

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
  // Invoices raised purely to record utility pass-throughs (electricity/guard/water) that
  // this owner never actually collects on — every invoice's linked ChargeEntry is created
  // already-settled instead of sitting outstanding and accruing penalty. See docs/Ledger-Plan.md.
  paymentWaived: boolean;
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

export type PaymentMethod = 'cash' | 'check' | 'gcash' | 'credit_card' | 'bank' | 'online_banking' | 'other';

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

export interface ReceivedPayment {
  paymentEntryId: string;
  paymentDate: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  note?: string;
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
  // Snapshotted from Tenant.paymentWaived at creation — see docs/Ledger-Plan.md #10.
  waived?: boolean;
  amountPaid: number;
  outstanding: number;
  payments: Payment[];
  previousBalanceHistory: PreviousBalanceEntry[];
  paymentsReceived?: ReceivedPayment[];
  status: InvoiceStatus;
  statusHistory: StatusChange[];
  ledgerPayments?: LedgerPaymentApplied[];
  createdAt: string;
  updatedAt: string;
}

export interface LedgerPaymentApplied {
  paymentEntryId: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  note?: string;
  principalApplied: number;
  penaltyApplied: number;
}

export type InvoiceInput = Omit<Invoice, 'id' | 'invoiceNumber' | 'ownerId' | 'subtotal' | 'currentChargesTotal' | 'totalDue' | 'amountPaid' | 'outstanding' | 'payments' | 'status' | 'createdAt' | 'updatedAt' | 'ledgerPayments'>;

export interface AppliedTo {
  chargeEntryId: string;
  penaltyApplied: number;
  principalApplied: number;
}

export interface ChargeEntry {
  id: string;
  entryType: 'charge';
  tenantId: string;
  ownerId: string;
  billingMonth: string;
  principalAmount: number;
  principalOutstanding: number;
  penaltyPaid: number;
  pendingPenalty?: number;
  // Historical penalty from a CSV import — see docs/Ledger-Plan.md #9. Purely informational;
  // it no longer caps `pendingPenalty` above (a charge still accrues normally after import).
  importedPenalty?: number;
  // An owner's explicit override from a draft invoice's Previous Balance Detail table
  // (docs/Ledger-Plan.md #5/#27). Unlike importedPenalty, this DOES cap `pendingPenalty` above —
  // when set, it's this minus `penaltyPaid`, not a formula-computed amount.
  penaltyOverride?: number;
  // Tenant.paymentWaived was on when this charge was created (principalOutstanding starts
  // at 0) — purely a display flag, so the ledger view can show "Waived" instead of looking
  // like it was paid with no payment record.
  waived?: boolean;
  invoiceNumber?: string;
  invoiceId?: string;
  description: string;
  source: 'import' | 'invoice';
  createdAt: string;
  updatedAt: string;
}

export interface PaymentLedgerEntry {
  id: string;
  entryType: 'payment';
  tenantId: string;
  ownerId: string;
  paymentDate: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  note?: string;
  appliedTo: AppliedTo[];
  createdAt: string;
  updatedAt: string;
}

export type LedgerEntry = ChargeEntry | PaymentLedgerEntry;

export interface LedgerSummary {
  charges: ChargeEntry[];
  payments: PaymentLedgerEntry[];
  previousBalance: number;
  previousBalanceHistory: PreviousBalanceEntry[];
  asOf: string;
}

export type LedgerChargeInput = {
  tenantId: string;
  billingMonth: string;
  principalAmount: number;
  penaltyAmount?: number;
  invoiceNumber?: string;
  description?: string;
};
