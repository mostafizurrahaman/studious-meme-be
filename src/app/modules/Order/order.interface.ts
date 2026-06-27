import { Document, Types } from 'mongoose';
import type { TShippingZone } from './order.constants';

export type TPaymentMethod = 'CASH_ON_DELIVERY' | 'PORTPOS';
export type TPaymentMethodInput = TPaymentMethod | 'COD';
export type TPaymentGateway = 'CASH_ON_DELIVERY' | 'PORTPOS';
export type TPaymentStatus =
  | 'UNPAID'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';
export type TOrderStatus =
  | 'PLACED'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface IOrderItemSnapshot {
  product: Types.ObjectId;
  title: string;
  slug: string;
  sku: string;
  image: string;
  brand: string;
  category: string;
  unitPrice: number;
  sellingUnit?: string;
  weightKg: number;
  isNoCOD: boolean;
  quantity: number;
  lineTotal: number;
}

export interface IOrderCustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  note?: string;
}

export interface IOrder extends Document {
  orderId: string;
  user: Types.ObjectId;
  items: IOrderItemSnapshot[];
  customer: IOrderCustomerInfo;
  subtotal: number;
  discount: number;
  delivery: number;
  shippingZone: TShippingZone;
  shippingCharge: number;
  totalWeightKg: number;
  codEligible: boolean;
  codReasons: string[];
  total: number;
  totalAmount: number;
  payableAmount: number;
  currency: string;
  couponCode?: string;
  paymentMethod: TPaymentMethod;
  paymentGateway?: TPaymentGateway;
  paymentStatus: TPaymentStatus;
  status: TOrderStatus;
  paymentId?: Types.ObjectId;
  invoiceId?: string;
  transactionId?: string;
  gatewayUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
