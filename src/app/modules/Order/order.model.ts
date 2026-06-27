import { Schema, model } from 'mongoose';
import {
  IOrder,
  IOrderCustomerInfo,
  IOrderItemSnapshot,
} from './order.interface';
import { SHIPPING_ZONE } from './order.constants';

const orderItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    sellingUnit: { type: String },
    weightKg: { type: Number, required: true, min: 0.01 },
    isNoCOD: { type: Boolean, required: true, default: false },
    quantity: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

const orderCustomerSchema = new Schema<IOrderCustomerInfo>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    note: { type: String },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSnapshotSchema], required: true },
    customer: { type: orderCustomerSchema, required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, required: true, default: 0 },
    delivery: { type: Number, required: true, default: 0 },
    shippingZone: {
      type: String,
      enum: Object.values(SHIPPING_ZONE),
      required: true,
    },
    shippingCharge: { type: Number, required: true, default: 0 },
    totalWeightKg: { type: Number, required: true, default: 0, min: 0 },
    codEligible: { type: Boolean, required: true, default: false },
    codReasons: { type: [String], required: true, default: [] },
    total: { type: Number, required: true },
    totalAmount: { type: Number, required: true, default: 0 },
    payableAmount: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: 'BDT' },
    couponCode: { type: String },
    paymentMethod: {
      type: String,
      enum: ['CASH_ON_DELIVERY', 'PORTPOS'],
      required: true,
    },
    paymentGateway: {
      type: String,
      enum: ['CASH_ON_DELIVERY', 'PORTPOS'],
    },
    paymentStatus: {
      type: String,
      enum: [
        'UNPAID',
        'PENDING_PAYMENT',
        'PAID',
        'FAILED',
        'CANCELLED',
        'REFUNDED',
      ],
      required: true,
      default: 'UNPAID',
    },
    status: {
      type: String,
      enum: [
        'PLACED',
        'PENDING_PAYMENT',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
      ],
      required: true,
      default: 'PLACED',
    },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    invoiceId: { type: String, unique: true, sparse: true },
    transactionId: { type: String },
    gatewayUrl: { type: String },
  },
  { timestamps: true, versionKey: false },
);

orderSchema.index(
  { user: 1, createdAt: -1 },
  { name: 'order_user_createdAt_idx' },
);
orderSchema.index(
  { status: 1, createdAt: -1 },
  { name: 'order_status_createdAt_idx' },
);
orderSchema.index(
  { invoiceId: 1 },
  { unique: true, sparse: true, name: 'order_invoiceId_idx' },
);

export const OrderModel = model<IOrder>('Order', orderSchema);
