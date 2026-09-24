import { PaymentMethod } from './types'

export interface PaymentMethodDetails {
  qrImage?: string // path under /public, e.g. '/payment-qr/gcash-qr.png'
  accountName: string
  accountNumber: string // mobile number for GCash/Maya, bank account number for Bank Transfer
  bankName?: string // Bank Transfer only
}

// ⚠️ PLACEHOLDER VALUES — replace before going live. Customers send real money based on
// what's shown here. This is hardcoded (not admin-editable) on purpose, same tradeoff
// PLAN_LIMITS/PLAN_PRICING already accept for values that rarely change — a code change
// (and redeploy) is how these get updated.
//
// To add a QR code: drop the image file in lynxbox-ph/public/payment-qr/ and set qrImage
// to its path (e.g. '/payment-qr/gcash-qr.png'). Leave qrImage unset to show a
// "QR code coming soon" placeholder instead.
export const PAYMENT_METHOD_DETAILS: Record<PaymentMethod, PaymentMethodDetails> = {
  gcash: {
    qrImage: '/payment-qr/gcash-qr.jpg',
    accountName: 'Rollyn Sy',
    accountNumber: '09177199309',
  },
  maya: {
    qrImage: undefined,
    accountName: 'REPLACE_WITH_ACCOUNT_NAME',
    accountNumber: 'REPLACE_WITH_MAYA_NUMBER',
  },
  bank_transfer: {
    qrImage: '/payment-qr/bank-transfer-qr.png',
    accountName: 'Willie Sy',
    accountNumber: '1094 5350 8078',
    bankName: 'Unionbank',
  },
}
