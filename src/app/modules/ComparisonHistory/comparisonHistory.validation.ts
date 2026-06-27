import { z } from 'zod';

// 1. compareSchema
const compareSchema = z.object({
  body: z.object({
    productId: z
      .string({ error: 'Product ID is required!' })
      .trim()
      .min(1, { message: 'Product ID is required!' }),
  }),
});

export const ComparisonHistoryValidation = { compareSchema };
