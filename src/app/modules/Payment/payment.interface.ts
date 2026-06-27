import { Document, Types } from 'mongoose';

export type TPaymentRecordStatus =
  | 'INITIATED'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';
export type TPaymentStatus = TPaymentRecordStatus;

export interface IPayment extends Document {
  user: Types.ObjectId;
  order: Types.ObjectId;
  amount: number;
  currency: string;
  status: TPaymentRecordStatus;

  gateway: 'PORTPOS';
  invoiceId?: string;
  transactionId: string;
  gatewayUrl?: string;
  paymentUrl?: string;
  rawInitResponse?: Record<string, unknown>;
  rawIpnPayload?: Record<string, unknown>;
  rawVerifyResponse?: Record<string, unknown>;
  gatewayPayload?: Record<string, unknown>;
  paidAt?: Date;
  failedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
