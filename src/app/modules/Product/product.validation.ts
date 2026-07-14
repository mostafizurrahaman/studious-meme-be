import { z } from 'zod';
import {
  DEFAULT_SELLING_UNIT,
  SELLING_UNIT_OPTIONS,
  normalizeSellingUnitInput,
} from './selling-unit';

const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

const normalizeYouTubeUrl = (value: unknown) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const isSupportedYouTubeUrl = (value: string) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase();
    const pathname = url.pathname.replace(/\/+$/, '');

    if (hostname === 'youtu.be') {
      const id = pathname.split('/').filter(Boolean)[0] ?? '';
      return YOUTUBE_VIDEO_ID_PATTERN.test(id);
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (pathname === '/watch') {
        return YOUTUBE_VIDEO_ID_PATTERN.test(url.searchParams.get('v') ?? '');
      }

      if (pathname.startsWith('/embed/')) {
        return YOUTUBE_VIDEO_ID_PATTERN.test(
          pathname.split('/').filter(Boolean)[1] ?? '',
        );
      }

      if (pathname.startsWith('/shorts/')) {
        return YOUTUBE_VIDEO_ID_PATTERN.test(
          pathname.split('/').filter(Boolean)[1] ?? '',
        );
      }
    }

    return false;
  } catch {
    return false;
  }
};

// 1. productBaseSchema
const sellingUnitSchema = z.preprocess(
  normalizeSellingUnitInput,
  z.enum(SELLING_UNIT_OPTIONS, { error: 'Invalid selling unit!' }),
);

const productBaseSchema = z.object({
  title: z
    .string({ error: 'Title is required!' })
    .trim()
    .min(1, { message: 'Title is required!' }),
  slug: z
    .string({ error: 'Slug is required!' })
    .trim()
    .min(1, { message: 'Slug is required!' }),
  sku: z
    .string({ error: 'SKU is required!' })
    .trim()
    .min(1, { message: 'SKU is required!' }),
  images: z
    .array(z.string().trim().min(1))
    .max(5, { message: 'You can upload up to 5 product images!' })
    .optional(),
  features: z
    .string({ error: 'Features are required!' })
    .trim()
    .min(1, { message: 'Features are required!' }),
  description: z
    .string({ error: 'Description is required!' })
    .trim()
    .min(1, { message: 'Description is required!' }),
  price: z.coerce
    .number({ error: 'Price is required!' })
    .min(0, { message: 'Price is required!' }),
  oldPrice: z.coerce
    .number()
    .min(0, { message: 'Old price must be at least 0!' })
    .optional(),
  badge: z.string().optional(),
  youtubeVideoUrl: z.preprocess(
    normalizeYouTubeUrl,
    z
      .string({ error: 'YouTube video URL must be valid!' })
      .refine(isSupportedYouTubeUrl, {
        message: 'Please enter a valid YouTube URL!',
      })
      .optional(),
  ),
  brand: z
    .string({ error: 'Brand is required!' })
    .trim()
    .min(1, { message: 'Brand is required!' }),
  category: z
    .string({ error: 'Category is required!' })
    .trim()
    .min(1, { message: 'Category is required!' }),
  subCategorySlug: z.string().optional(),
  weightKg: z.coerce
    .number({ error: 'Weight is required!' })
    .min(0.01, { message: 'Weight must be greater than 0!' }),
  stock: z.preprocess(
    value => {
      if (value === '' || value === null) return null;
      if (typeof value === 'string' && value.trim() !== '')
        return Number(value);

      return value;
    },
    z
      .union([
        z.number().int().min(0, { message: 'Stock must be at least 0!' }),
        z.null(),
      ])
      .optional(),
  ),
  rating: z.coerce
    .number({ error: 'Rating is required!' })
    .min(0, { message: 'Rating is required!' }),
  isFeatured: z.boolean().optional(),
  isNoCOD: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const priceFilterSchema = z
  .string()
  .regex(/^(under-10000|10000-50000|50000-plus|\d*-\d*)$/, {
    error:
      "Price must be one of: 'under-10000', '10000-50000', '50000-plus', or a custom range like '100-500', '100-', or '-500'.",
  });

const getProductsQueryValidationSchema = z.object({
  query: z.object({
    // Pagination
    page: z.coerce
      .number({
        error: 'Page must be a valid number.',
      })
      .int({
        error: 'Page must be an integer.',
      })
      .positive({
        error: 'Page must be greater than 0.',
      })
      .optional(),

    limit: z.coerce
      .number({
        error: 'Limit must be a valid number.',
      })
      .int({
        error: 'Limit must be an integer.',
      })
      .positive({
        error: 'Limit must be greater than 0.',
      })
      .max(100, {
        error: 'Limit cannot exceed 100.',
      })
      .optional(),

    // Sorting
    sort: z
      .enum(['latest', 'oldest', 'price-asc', 'price-desc'], {
        error: 'Sort must be one of: latest, oldest, price-asc, or price-desc.',
      })
      .optional(),

    // Projection
    fields: z
      .string()
      .trim()
      .min(1, {
        error: 'Fields cannot be empty.',
      })
      .optional(),

    // Search
    searchTerm: z
      .string()
      .trim()
      .min(1, {
        error: 'Search term cannot be empty.',
      })
      .optional(),

    // Category
    category: z
      .string()
      .trim()
      .min(1, {
        error: 'Category cannot be empty.',
      })
      .optional(),

    c: z
      .string()
      .trim()
      .min(1, {
        error: 'Category alias (c) cannot be empty.',
      })
      .optional(),

    // Sub Category
    subCategorySlug: z
      .string()
      .trim()
      .min(1, {
        error: 'Sub-category slug cannot be empty.',
      })
      .optional(),

    subCategory: z
      .string()
      .trim()
      .min(1, {
        error: 'Sub-category cannot be empty.',
      })
      .optional(),

    // Stock Filter
    stock: z
      .enum(['in-stock', 'featured', 'sale'], {
        error: 'Stock filter must be one of: in-stock, featured, or sale.',
      })
      .optional(),

    s: z
      .enum(['in-stock', 'featured', 'sale'], {
        error:
          'Stock filter alias (s) must be one of: in-stock, featured, or sale.',
      })
      .optional(),

    // Tag
    tag: z
      .enum(['featured', 'sale', 'latest', 'industrial', 'home'], {
        error:
          'Tag must be one of: featured, sale, latest, industrial, or home.',
      })
      .optional(),

    // Price
    price: priceFilterSchema.optional(),
    p: priceFilterSchema.optional(),

    // Brand
    brand: z
      .string()
      .trim()
      .min(1, {
        error: 'Brand cannot be empty.',
      })
      .optional(),

    b: z
      .string()
      .trim()
      .min(1, {
        error: 'Brand alias (b) cannot be empty.',
      })
      .optional(),

    // Exclude Product
    excludeSlug: z
      .string()
      .trim()
      .min(1, {
        error: 'Exclude slug cannot be empty.',
      })
      .optional(),

    // Include Inactive Products
    includeInactive: z.coerce
      .boolean({
        error: 'includeInactive must be a boolean value.',
      })
      .optional(),
  }),
});

export const ProductValidation = {
  productCreateSchema: z.object({
    body: productBaseSchema.extend({
      sellingUnit: sellingUnitSchema.default(DEFAULT_SELLING_UNIT),
    }),
  }),
  productUpdateSchema: z.object({
    params: z.object({
      slug: z
        .string({ error: 'Slug is required!' })
        .trim()
        .min(1, { message: 'Slug is required!' }),
    }),
    body: productBaseSchema
      .extend({
        sellingUnit: sellingUnitSchema,
      })
      .partial(),
  }),
  getProductsQueryValidationSchema,
};

export type TGetAllProductQueryType = z.infer<
  typeof getProductsQueryValidationSchema.shape.query
>;
