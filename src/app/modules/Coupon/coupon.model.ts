import { Schema, model } from 'mongoose';
import { ICoupon } from './coupon.interface';

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'DISCOUNT_AMOUNT', 'FREE_SHIPPING'],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    minSubtotal: { type: Number, min: 0, default: 0 },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

couponSchema.index({ code: 1 }, { unique: true, name: 'coupon_code_idx' });
couponSchema.index(
  { isActive: 1, expiresAt: -1 },
  { name: 'coupon_isActive_expiresAt_idx' },
);

export const CouponModel = model<ICoupon>('Coupon', couponSchema);
