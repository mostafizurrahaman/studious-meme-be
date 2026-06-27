import { Document } from 'mongoose';
import type { TShippingZone } from '../Order/order.constants';

export type TCouponDiscountType =
  | 'PERCENTAGE'
  | 'DISCOUNT_AMOUNT'
  | 'FREE_SHIPPING';

export interface ICoupon extends Document {
  code: string;
  label: string;
  description?: string;
  discountType: TCouponDiscountType;
  discountValue: number;
  minSubtotal?: number;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TCouponRecord = {
  id: string;
  code: string;
  label: string;
  description?: string;
  discountType: TCouponDiscountType;
  discountValue: number;
  minSubtotal?: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TCouponCheckoutItem = {
  unitPrice: number;
  quantity: number;
  weightKg?: number;
  isNoCOD?: boolean;
};

export type TCouponCheckoutInput = {
  couponCode?: string;
  items: TCouponCheckoutItem[];
  city?: string;
  address?: string;
};

export type TCouponCheckoutSummary = {
  coupon: TCouponRecord | null;
  isValid: boolean;
  message: string;
  subtotal: number;
  discount: number;
  shippingCharge: number;
  baseShippingCharge: number;
  totalWeightKg: number;
  shippingZone: TShippingZone;
  codEligible: boolean;
  codAvailable: boolean;
  codReasons: string[];
  codUnavailableReasons: string[];
  total: number;
  payableAmount: number;
};

export type TCouponCreatePayload = {
  code: string;
  label: string;
  description?: string;
  discountType: TCouponDiscountType;
  discountValue: number;
  minSubtotal?: number;
  expiresAt: Date;
  isActive?: boolean;
};
