import {
  calculateCodEligibility,
  calculateShippingCharge,
  deriveShippingZone,
  getTotalWeightKg,
} from '../Order/order.utils';
import type {
  TCouponCheckoutInput,
  TCouponCheckoutSummary,
  TCouponDiscountType,
  TCouponRecord,
} from './coupon.interface';

export const normalizeCouponCode = (code: string) => code.trim().toUpperCase();

export const serializeCoupon = (coupon: {
  _id: unknown;
  code: string;
  label: string;
  description?: string;
  discountType: TCouponDiscountType;
  discountValue: number;
  minSubtotal?: number;
  expiresAt: Date | string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}): TCouponRecord => ({
  id: String(coupon._id),
  code: coupon.code,
  label: coupon.label,
  description: coupon.description,
  discountType: coupon.discountType,
  discountValue: coupon.discountValue,
  minSubtotal:
    typeof coupon.minSubtotal === 'number' ? coupon.minSubtotal : undefined,
  expiresAt: new Date(coupon.expiresAt).toISOString(),
  isActive: coupon.isActive,
  createdAt: new Date(coupon.createdAt).toISOString(),
  updatedAt: new Date(coupon.updatedAt).toISOString(),
});

export const buildCouponCheckoutBase = (
  payload: Pick<TCouponCheckoutInput, 'items' | 'city' | 'address'>,
) => {
  const subtotal = payload.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const totalWeightKg = getTotalWeightKg(
    payload.items.reduce(
      (sum, item) =>
        sum +
        (Number.isFinite(item.weightKg ?? 1) ? (item.weightKg ?? 1) : 1) *
          item.quantity,
      0,
    ),
  );

  const shippingZone = deriveShippingZone(payload.city);
  const baseShippingCharge = calculateShippingCharge({
    totalWeightKg,
    zone: shippingZone,
  });
  const codEligibility = calculateCodEligibility({
    subtotal,
    itemBlocksCod: payload.items.some((item) => item.isNoCOD),
  });

  return {
    subtotal,
    totalWeightKg,
    shippingZone,
    baseShippingCharge,
    codEligible: codEligibility.eligible,
    codAvailable: codEligibility.codAvailable,
    codReasons: codEligibility.codUnavailableReasons,
    codUnavailableReasons: codEligibility.codUnavailableReasons,
  };
};

export const resolveCouponSummary = (
  coupon: {
    discountType: TCouponDiscountType;
    discountValue: number;
  } | null,
  base: ReturnType<typeof buildCouponCheckoutBase>,
): Pick<
  TCouponCheckoutSummary,
  'discount' | 'shippingCharge' | 'total' | 'payableAmount'
> => {
  const discount =
    coupon?.discountType === 'PERCENTAGE'
      ? Math.min((base.subtotal * coupon.discountValue) / 100, base.subtotal)
      : coupon?.discountType === 'DISCOUNT_AMOUNT'
        ? Math.min(coupon.discountValue, base.subtotal)
        : 0;

  const shippingCharge =
    coupon?.discountType === 'FREE_SHIPPING' ? 0 : base.baseShippingCharge;
  const total = Math.max(base.subtotal - discount + shippingCharge, 0);

  return {
    discount,
    shippingCharge,
    total,
    payableAmount: total,
  };
};

export const buildCouponInvalidSummary = (
  base: ReturnType<typeof buildCouponCheckoutBase>,
  message: string,
): TCouponCheckoutSummary => {
  const { discount, shippingCharge, total, payableAmount } =
    resolveCouponSummary(null, base);

  return {
    coupon: null,
    isValid: false,
    message,
    subtotal: base.subtotal,
    discount,
    shippingCharge,
    baseShippingCharge: base.baseShippingCharge,
    totalWeightKg: base.totalWeightKg,
    shippingZone: base.shippingZone,
    codEligible: base.codEligible,
    codAvailable: base.codAvailable,
    codReasons: base.codReasons,
    codUnavailableReasons: base.codUnavailableReasons,
    total,
    payableAmount,
  };
};
