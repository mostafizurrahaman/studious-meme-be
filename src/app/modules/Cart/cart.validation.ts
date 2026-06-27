import { z } from 'zod';

const cartItemSchema = z.object({
  productId: z
    .string({ error: 'Product ID is required!' })
    .trim()
    .min(1, { message: 'Product ID is required!' }),
  quantity: z.coerce
    .number({ error: 'Quantity is required!' })
    .int()
    .min(1, { message: 'Quantity must be at least 1!' })
    .optional(),
});

const cartUpdateSchema = z.object({
  body: z.object({
    productId: z
      .string({ error: 'Product ID is required!' })
      .trim()
      .min(1, { message: 'Product ID is required!' }),
    quantity: z.coerce
      .number({ error: 'Quantity is required!' })
      .int()
      .min(1, { message: 'Quantity must be at least 1!' }),
  }),
});

const cartItemPathSchema = z.object({
  params: z.object({
    productId: z
      .string({ error: 'Product ID is required!' })
      .trim()
      .min(1, { message: 'Product ID is required!' }),
  }),
});

const cartAddSchema = z.object({ body: cartItemSchema });

export const CartValidation = {
  cartAddSchema,
  cartUpdateSchema,
  cartItemPathSchema,
};
