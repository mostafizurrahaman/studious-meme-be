import { z } from 'zod';

const couponItemSchema = z.object({
  unitPrice: z
    .number({ error: 'Unit price is required!' })
    .nonnegative({ message: 'Unit price must be at least 0!' }),
  quantity: z
    .number({ error: 'Quantity is required!' })
    .int()
    .positive({ message: 'Quantity must be at least 1!' }),
  weightKg: z
    .number()
    .positive({ message: 'Weight must be positive!' })
    .optional(),
  isNoCOD: z.boolean().optional(),
});

const couponBaseObject = z.object({
  code: z
    .string({ error: 'Code is required!' })
    .trim()
    .min(2, { message: 'Code must be at least 2 characters long!' })
    .max(50, { message: 'Code must be at most 50 characters long!' }),
  label: z
    .string({ error: 'Label is required!' })
    .trim()
    .min(2, { message: 'Label must be at least 2 characters long!' })
    .max(100, { message: 'Label must be at most 100 characters long!' }),
  description: z.string().trim().optional(),
  discountType: z.enum(['PERCENTAGE', 'DISCOUNT_AMOUNT', 'FREE_SHIPPING'], {
    error: 'Discount type is required!',
  }),
  discountValue: z
    .number({ error: 'Discount value is required!' })
    .nonnegative({ message: 'Discount value must be at least 0!' }),
  minSubtotal: z
    .number()
    .nonnegative({ message: 'Minimum subtotal must be at least 0!' })
    .optional(),
  expiresAt: z.coerce.date({ error: 'Expiry date is required!' }),
  isActive: z.boolean().optional(),
});

const couponCreateBodySchema = couponBaseObject.superRefine((value, ctx) => {
  if (value.discountType === 'PERCENTAGE' && value.discountValue > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Percentage discount cannot be more than 100!',
      path: ['discountValue'],
    });
  }
});

const couponUpdateBodySchema = couponBaseObject
  .partial()
  .superRefine((value, ctx) => {
    if (
      value.discountType === 'PERCENTAGE' &&
      typeof value.discountValue === 'number' &&
      value.discountValue > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percentage discount cannot be more than 100!',
        path: ['discountValue'],
      });
    }
  });

const couponVerifySchema = z.object({
  body: z.object({
    couponCode: z
      .string({ error: 'Coupon code is required!' })
      .trim()
      .min(1, { message: 'Coupon code is required!' }),
    items: z
      .array(couponItemSchema)
      .min(1, { message: 'At least one item is required!' }),
    city: z.string().trim().optional(),
    address: z.string().trim().optional(),
  }),
});

const couponStatusSchema = z.object({
  params: z.object({
    couponId: z
      .string({ error: 'Coupon ID is required!' })
      .trim()
      .min(1, { message: 'Coupon ID is required!' }),
  }),
  body: z.object({
    isActive: z.boolean({ error: 'isActive is required!' }),
  }),
});

const couponIdParamsSchema = z.object({
  couponId: z
    .string({ error: 'Coupon ID is required!' })
    .trim()
    .min(1, { message: 'Coupon ID is required!' }),
});

export const CouponValidation = {
  couponCreateSchema: z.object({ body: couponCreateBodySchema }),
  couponUpdateSchema: z.object({
    params: couponIdParamsSchema,
    body: couponUpdateBodySchema,
  }),
  couponStatusSchema,
  couponVerifySchema,
};
