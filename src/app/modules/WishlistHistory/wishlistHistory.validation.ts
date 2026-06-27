import { z } from 'zod';

const wishlistProductSchema = z.object({
  body: z.object({
    productId: z
      .string({ error: 'Product ID is required!' })
      .trim()
      .min(1, 'Product ID is required!'),
  }),
});

export const WishlistHistoryValidation = { wishlistProductSchema };
