import httpStatus from 'http-status';
import { AppError } from '../../utils';
import { CouponModel } from './coupon.model';
import {
  buildCouponCheckoutBase,
  buildCouponInvalidSummary,
  normalizeCouponCode,
  resolveCouponSummary,
  serializeCoupon,
} from './coupon.utils';
import type {
  TCouponCheckoutInput,
  TCouponCheckoutSummary,
  TCouponCreatePayload,
} from './coupon.interface';

type CouponQuery = Record<string, unknown>;

const buildCouponFilter = (query: CouponQuery) => {
  const filter: Record<string, unknown> = {};
  const searchTerm =
    typeof query.searchTerm === 'string' ? query.searchTerm.trim() : '';
  const isActive =
    typeof query.isActive === 'string' ? query.isActive.trim() : '';
  const discountType =
    typeof query.discountType === 'string' ? query.discountType.trim() : '';

  if (searchTerm) {
    filter.$or = [
      { code: { $regex: searchTerm, $options: 'i' } },
      { label: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  if (isActive === 'true') {
    filter.isActive = true;
  } else if (isActive === 'false') {
    filter.isActive = false;
  }

  if (discountType) {
    filter.discountType = discountType;
  }

  return filter;
};

const ensureUniqueCouponCode = async (code: string, couponId?: string) => {
  const query: Record<string, unknown> = { code };

  if (couponId) {
    query._id = { $ne: couponId };
  }

  const duplicate = await CouponModel.findOne(query).lean();

  if (duplicate) {
    throw new AppError(httpStatus.CONFLICT, 'Coupon code already exists!');
  }
};

const normalizeCouponPayload = (payload: Partial<TCouponCreatePayload>) => {
  const normalized: Partial<TCouponCreatePayload> = {};

  if (typeof payload.code === 'string') {
    normalized.code = normalizeCouponCode(payload.code);
  }

  if (typeof payload.label === 'string') {
    normalized.label = payload.label.trim();
  }

  if (typeof payload.description === 'string') {
    normalized.description = payload.description.trim();
  }

  if (typeof payload.discountType === 'string') {
    normalized.discountType = payload.discountType;
  }

  if (typeof payload.discountValue === 'number') {
    normalized.discountValue = payload.discountValue;
  }

  if (typeof payload.minSubtotal === 'number') {
    normalized.minSubtotal = payload.minSubtotal;
  }

  if (payload.expiresAt instanceof Date) {
    normalized.expiresAt = payload.expiresAt;
  }

  if (typeof payload.isActive === 'boolean') {
    normalized.isActive = payload.isActive;
  }

  return normalized;
};

const createCouponIntoDB = async (payload: TCouponCreatePayload) => {
  const normalized = normalizeCouponPayload(payload) as TCouponCreatePayload;

  await ensureUniqueCouponCode(normalized.code);

  const coupon = await CouponModel.create({
    ...normalized,
    discountValue:
      normalized.discountType === 'FREE_SHIPPING'
        ? 0
        : normalized.discountValue,
    minSubtotal: normalized.minSubtotal ?? 0,
    isActive: normalized.isActive ?? true,
  });

  return serializeCoupon(coupon.toObject());
};

const getAllCouponsFromDB = async (query: CouponQuery) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 50;
  const skip = (page - 1) * limit;
  const filter = buildCouponFilter(query);

  const [data, total] = await Promise.all([
    CouponModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CouponModel.countDocuments(filter),
  ]);

  return {
    data: data.map(serializeCoupon),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const getCouponByIdFromDB = async (couponId: string) => {
  const coupon = await CouponModel.findById(couponId).lean();

  if (!coupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found!');
  }

  return serializeCoupon(coupon);
};

const updateCouponIntoDB = async (
  couponId: string,
  payload: Partial<TCouponCreatePayload>,
) => {
  const existingCoupon = await CouponModel.findById(couponId).lean();

  if (!existingCoupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found!');
  }

  const normalized = normalizeCouponPayload(payload);

  if (normalized.code) {
    await ensureUniqueCouponCode(normalized.code, couponId);
  }

  const nextDiscountType =
    normalized.discountType ?? existingCoupon.discountType;
  const nextDiscountValue =
    typeof normalized.discountValue === 'number'
      ? normalized.discountValue
      : existingCoupon.discountValue;

  const coupon = await CouponModel.findByIdAndUpdate(
    couponId,
    {
      ...(normalized.code ? { code: normalized.code } : {}),
      ...(normalized.label ? { label: normalized.label } : {}),
      ...(typeof normalized.description === 'string'
        ? { description: normalized.description }
        : {}),
      ...(normalized.discountType
        ? { discountType: normalized.discountType }
        : {}),
      ...(normalized.discountType ||
      typeof normalized.discountValue === 'number'
        ? {
            discountValue:
              nextDiscountType === 'FREE_SHIPPING' ? 0 : nextDiscountValue,
          }
        : {}),
      ...(typeof normalized.minSubtotal === 'number'
        ? { minSubtotal: normalized.minSubtotal }
        : {}),
      ...(normalized.expiresAt ? { expiresAt: normalized.expiresAt } : {}),
      ...(typeof normalized.isActive === 'boolean'
        ? { isActive: normalized.isActive }
        : {}),
    },
    { returnDocument: 'after', runValidators: true },
  ).lean();

  if (!coupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found!');
  }

  return serializeCoupon(coupon);
};

const updateCouponStatusIntoDB = async (couponId: string, isActive: boolean) =>
  updateCouponIntoDB(couponId, { isActive });

const deleteCouponFromDB = async (couponId: string) => {
  const coupon = await CouponModel.findByIdAndDelete(couponId).lean();

  if (!coupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found!');
  }

  return serializeCoupon(coupon);
};

const invalidCouponSummary = (
  base: ReturnType<typeof buildCouponCheckoutBase>,
  message: string,
): TCouponCheckoutSummary => buildCouponInvalidSummary(base, message);

const calculateCouponCheckoutSummary = async (
  payload: TCouponCheckoutInput,
): Promise<TCouponCheckoutSummary> => {
  const base = buildCouponCheckoutBase(payload);
  const couponCode = payload.couponCode?.trim();

  if (!couponCode) {
    return invalidCouponSummary(base, 'Coupon code is required!');
  }

  const coupon = await CouponModel.findOne({
    code: normalizeCouponCode(couponCode),
  }).lean();

  if (!coupon) {
    return invalidCouponSummary(base, 'Coupon code was not recognized.');
  }

  if (!coupon.isActive) {
    return invalidCouponSummary(base, 'This coupon is disabled.');
  }

  if (new Date(coupon.expiresAt).getTime() <= Date.now()) {
    return invalidCouponSummary(base, 'This coupon has expired.');
  }

  if (coupon.minSubtotal && base.subtotal < coupon.minSubtotal) {
    return invalidCouponSummary(
      base,
      `This coupon requires a minimum subtotal of ৳${coupon.minSubtotal.toLocaleString('en-US')}.`,
    );
  }

  const summary = resolveCouponSummary(
    {
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
    base,
  );

  return {
    coupon: serializeCoupon(coupon),
    isValid: true,
    message: 'Coupon applied successfully.',
    subtotal: base.subtotal,
    discount: summary.discount,
    shippingCharge: summary.shippingCharge,
    baseShippingCharge: base.baseShippingCharge,
    totalWeightKg: base.totalWeightKg,
    shippingZone: base.shippingZone,
    codEligible: base.codEligible,
    codAvailable: base.codAvailable,
    codReasons: base.codReasons,
    codUnavailableReasons: base.codUnavailableReasons,
    total: summary.total,
    payableAmount: summary.payableAmount,
  };
};

const verifyCouponFromDB = async (payload: TCouponCheckoutInput) =>
  calculateCouponCheckoutSummary(payload);

export const CouponService = {
  createCouponIntoDB,
  getAllCouponsFromDB,
  getCouponByIdFromDB,
  updateCouponIntoDB,
  deleteCouponFromDB,
  updateCouponStatusIntoDB,
  calculateCouponCheckoutSummary,
  verifyCouponFromDB,
};
