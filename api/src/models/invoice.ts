import { v4 as uuidv4 } from 'uuid';
import { EntityType, BaseEntity } from '../lib/dynamodb';

export interface WaterCharge {
  mode: 'metered' | 'fixed' | 'direct';
  presentReading?: number;
  previousReading?: number;
  rate?: number;
  amount: number;
}

export interface ElectricityCharge {
  mode?: 'metered' | 'direct';
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

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'printed';

export interface StatusChange {
  from: InvoiceStatus;
  to: InvoiceStatus;
  changedAt: string;
  changedBy: string;
}

export interface Invoice extends BaseEntity {
  [key: string]: any;
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
  deletedAt?: string;
}

export type InvoiceInput = {
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
  vat?: number;
  withholdingTax?: number;
  water: WaterCharge;
  electricity: ElectricityCharge;
  guard?: number;
  otherCharges?: OtherCharge[];
  discount?: number;
  previousBalance?: number;
  previousBalanceHistory?: PreviousBalanceEntry[];
};

function computeTotals(data: InvoiceInput) {
  const rent = data.rent;
  const vat = data.vat ?? 0;
  const withholdingTax = data.withholdingTax ?? 0;
  const subtotal = rent + vat - withholdingTax;
  const waterAmt = data.water?.amount ?? 0;
  const elecAmt = data.electricity?.amount ?? 0;
  const guard = data.guard ?? 0;
  const othersTotal = (data.otherCharges ?? []).reduce((s, c) => s + c.amount, 0);
  const discount = data.discount ?? 0;
  const currentChargesTotal = subtotal + waterAmt + elecAmt + guard + othersTotal - discount;
  const previousBalance = data.previousBalance ?? 0;
  const totalDue = currentChargesTotal + previousBalance;
  return { subtotal, currentChargesTotal, totalDue };
}

export function createInvoice(data: InvoiceInput, invoiceNumber: string): Invoice {
  const now = new Date().toISOString();
  const id = uuidv4();
  const { subtotal, currentChargesTotal, totalDue } = computeTotals(data);
  return {
    PK: `INVOICE#${id}`,
    SK: `INVOICE#${id}`,
    GSI1PK: `TENANT#${data.tenantId}`,
    GSI1SK: `INVOICE#${data.billingMonth}#${id}`,
    entityType: EntityType.INVOICE,
    id,
    invoiceNumber,
    ownerId: data.ownerId,
    tenantId: data.tenantId,
    buildingId: data.buildingId,
    buildingName: data.buildingName,
    buildingAddress: data.buildingAddress,
    buildingPhone: data.buildingPhone,
    buildingEmail: data.buildingEmail,
    tenantCode: data.tenantCode,
    lesseeName: data.lesseeName,
    floor: data.floor,
    roomNumber: data.roomNumber,
    billingMonth: data.billingMonth,
    billingLabel: data.billingLabel,
    rent: data.rent,
    vat: data.vat ?? 0,
    withholdingTax: data.withholdingTax ?? 0,
    water: data.water,
    electricity: data.electricity,
    guard: data.guard ?? 0,
    otherCharges: data.otherCharges ?? [],
    discount: data.discount ?? 0,
    subtotal,
    currentChargesTotal,
    previousBalance: data.previousBalance ?? 0,
    totalDue,
    amountPaid: 0,
    outstanding: totalDue,
    payments: [],
    previousBalanceHistory: data.previousBalanceHistory ?? [],
    status: 'draft',
    statusHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}
