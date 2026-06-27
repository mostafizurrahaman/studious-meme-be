import { z } from 'zod';

const orderItemSchema = z.object({
  sku: z
    .string({ error: 'SKU is required!' })
    .trim()
    .min(1, { message: 'SKU is required!' }),
  quantity: z
    .number()
    .int()
    .positive({ message: 'Quantity must be at least 1!' }),
});

const createOrderSchema = z.object({
  body: z.object({
    items: z
      .array(orderItemSchema)
      .min(1, { message: 'At least one item is required!' }),
    customer: z.object({
      name: z
        .string({ error: 'Name is required!' })
        .trim()
        .min(2, { message: 'Name must be at least 2 characters long!' }),
      phone: z
        .string({ error: 'Phone is required!' })
        .trim()
        .min(6, { message: 'Phone must be at least 6 characters long!' }),
      email: z.string().trim().email().optional().or(z.literal('')),
      address: z
        .string({ error: 'Address is required!' })
        .trim()
        .min(5, { message: 'Address must be at least 5 characters long!' }),
      city: z
        .string({ error: 'City is required!' })
        .trim()
        .min(2, { message: 'City must be at least 2 characters long!' }),
      note: z.string().trim().optional(),
    }),
    couponCode: z.string().trim().optional(),
    paymentMethod: z.enum(['COD', 'CASH_ON_DELIVERY', 'PORTPOS'], {
      error: 'Payment method is required!',
    }),
  }),
});

const orderCheckoutPreviewSchema = z.object({
  body: createOrderSchema.shape.body.pick({
    items: true,
    customer: true,
    couponCode: true,
    paymentMethod: true,
  }),
});

const updateOrderStatusSchema = z.object({
  params: z.object({
    orderId: z
      .string({ error: 'Order ID is required!' })
      .trim()
      .min(1, { message: 'Order ID is required!' }),
  }),
  body: z.object({
    status: z.enum(
      [
        'PLACED',
        'PENDING_PAYMENT',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
      ],
      {
        error: 'Status is required!',
      },
    ),
  }),
});

export const OrderValidation = {
  createOrderSchema,
  orderCheckoutPreviewSchema,
  updateOrderStatusSchema,
};
