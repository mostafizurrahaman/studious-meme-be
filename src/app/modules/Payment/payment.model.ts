import { Schema, model } from 'mongoose';
import { IPayment } from './payment.interface';

const paymentSchema = new Schema<IPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'BDT' },
    status: {
      type: String,
      enum: ['INITIATED', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'],
      default: 'INITIATED',
    },
    gateway: { type: String, enum: ['PORTPOS'], default: 'PORTPOS' },
    invoiceId: { type: String, unique: true, sparse: true },
    transactionId: { type: String, required: true, unique: true },
    gatewayUrl: { type: String },
    paymentUrl: { type: String },
    rawInitResponse: { type: Schema.Types.Mixed },
    rawIpnPayload: { type: Schema.Types.Mixed },
    rawVerifyResponse: { type: Schema.Types.Mixed },
    gatewayPayload: { type: Schema.Types.Mixed },
    paidAt: { type: Date },
    failedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

paymentSchema.index(
  { user: 1, createdAt: -1 },
  { name: 'payment_user_createdAt_idx' },
);
paymentSchema.index(
  { order: 1, createdAt: -1 },
  { name: 'payment_order_createdAt_idx' },
);
paymentSchema.index(
  { status: 1, createdAt: -1 },
  { name: 'payment_status_createdAt_idx' },
);
paymentSchema.index(
  { invoiceId: 1 },
  { unique: true, sparse: true, name: 'payment_invoiceId_idx' },
);

export const Payment = model<IPayment>('Payment', paymentSchema);
