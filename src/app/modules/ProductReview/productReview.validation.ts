import { z } from 'zod';

const objectIdSchema = z
  .string({ error: 'ID is required!' })
  .trim()
  .min(1, { message: 'ID is required!' });
const productRefSchema = z
  .string({ error: 'Product is required!' })
  .trim()
  .min(1, { message: 'Product is required!' });

const reviewImagesSchema = z
  .array(z.string().trim().min(1))
  .max(5, { message: 'You can upload up to 5 review images!' })
  .optional();

const customerCreateReviewSchema = z.object({
  body: z.object({
    product: productRefSchema,
    rating: z.coerce
      .number({ error: 'Rating is required!' })
      .min(1, { message: 'Rating must be at least 1!' })
      .max(5, { message: 'Rating cannot exceed 5!' }),
    comment: z
      .string({ error: 'Comment is required!' })
      .trim()
      .min(1, { message: 'Comment is required!' })
      .max(2000, { message: 'Comment cannot exceed 2000 characters!' }),
    images: reviewImagesSchema,
  }),
});

const manualCreateReviewSchema = z.object({
  body: z.object({
    product: productRefSchema,
    displayName: z
      .string({ error: 'Display name is required!' })
      .trim()
      .min(1, { message: 'Display name is required!' })
      .max(100, { message: 'Display name cannot exceed 100 characters!' }),
    displayImage: z.string().trim().optional(),
    rating: z.coerce
      .number({ error: 'Rating is required!' })
      .min(1, { message: 'Rating must be at least 1!' })
      .max(5, { message: 'Rating cannot exceed 5!' }),

    comment: z
      .string({ error: 'Comment is required!' })
      .trim()
      .min(1, { message: 'Comment is required!' })
      .max(2000, { message: 'Comment cannot exceed 2000 characters!' }),
    images: reviewImagesSchema,
    status: z.enum(['pending', 'approved', 'rejected', 'hidden']).optional(),
  }),
});

const reviewIdParamsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

const reviewStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'hidden']),
});

const updateReviewStatusSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: reviewStatusSchema,
});

const updateReviewSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      displayName: z
        .string()
        .trim()
        .min(1, { message: 'Display name is required!' })
        .max(100, { message: 'Display name cannot exceed 100 characters!' })
        .optional(),
      displayImage: z
        .string()
        .trim()
        .min(1, { message: 'Display image is required!' })
        .optional(),
      rating: z.coerce
        .number()
        .min(1, { message: 'Rating must be at least 1!' })
        .max(5, { message: 'Rating cannot exceed 5!' })
        .optional(),
      comment: z
        .string()
        .trim()
        .min(1, { message: 'Comment is required!' })
        .max(2000, { message: 'Comment cannot exceed 2000 characters!' })
        .optional(),
      images: reviewImagesSchema,
      status: z.enum(['pending', 'approved', 'rejected', 'hidden']).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required!',
    }),
});

const adminReviewListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'hidden']).optional(),
    source: z.enum(['customer', 'manual']).optional(),
    product: z.string().trim().optional(),
    user: z.string().trim().optional(),
    rating: z.coerce.number().min(1).max(5).optional(),
    searchTerm: z.string().trim().optional(),
    createdFrom: z.string().trim().optional(),
    createdTo: z.string().trim().optional(),
    sort: z
      .enum([
        'createdAt-desc',
        'createdAt-asc',
        'rating-desc',
        'rating-asc',
        'status-desc',
        'status-asc',
      ])
      .optional(),
  }),
});

const publicReviewListSchema = z.object({
  params: z.object({
    productId: objectIdSchema,
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort: z
      .enum(['createdAt-desc', 'createdAt-asc', 'rating-desc', 'rating-asc'])
      .optional(),
  }),
});

export const ProductReviewValidation = {
  customerCreateReviewSchema,
  manualCreateReviewSchema,
  reviewIdParamsSchema,
  reviewStatusSchema,
  updateReviewStatusSchema,
  updateReviewSchema,
  adminReviewListSchema,
  publicReviewListSchema,
};
