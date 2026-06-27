import { z } from 'zod';

// 1. categorySubCategorySchema
const categorySubCategorySchema = z.object({
  name: z
    .string({ error: 'SubCategory name is required!' })
    .trim()
    .min(1, { message: 'SubCategory name is required!' }),
  slug: z
    .string({ error: 'SubCategory slug is required!' })
    .trim()
    .min(1, { message: 'SubCategory slug is required!' }),
  image: z.string().optional(),
  description: z
    .string({ error: 'SubCategory description is required!' })
    .trim()
    .min(1, { message: 'SubCategory description is required!' }),
  accent: z.string().optional(),
  isActive: z.boolean().optional(),
});

// 2. categoryBaseSchema
const categoryBaseSchema = z.object({
  name: z
    .string({ error: 'Category name is required!' })
    .trim()
    .min(1, { message: 'Category name is required!' }),
  slug: z
    .string({ error: 'Category slug is required!' })
    .trim()
    .min(1, { message: 'Category slug is required!' }),
  subCategories: z.array(categorySubCategorySchema).optional(),
  image: z.string().optional(),
  description: z
    .string({ error: 'Category description is required!' })
    .trim()
    .min(1, { message: 'Category description is required!' }),
  accent: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const CategoryValidation = {
  categoryCreateSchema: z.object({ body: categoryBaseSchema }),
  categoryUpdateSchema: z.object({
    params: z.object({
      slug: z
        .string({ error: 'Category slug is required!' })
        .trim()
        .min(1, { message: 'Category slug is required!' }),
    }),
    body: categoryBaseSchema.partial().extend({
      description: categoryBaseSchema.shape.description,
    }),
  }),
  categorySubCategoryCreateSchema: z.object({
    params: z.object({
      slug: z
        .string({ error: 'Category slug is required!' })
        .trim()
        .min(1, { message: 'Category slug is required!' }),
    }),
    body: categorySubCategorySchema,
  }),
  categorySubCategoryUpdateSchema: z.object({
    params: z.object({
      slug: z
        .string({ error: 'Category slug is required!' })
        .trim()
        .min(1, { message: 'Category slug is required!' }),
      subCategorySlug: z
        .string({ error: 'SubCategory slug is required!' })
        .trim()
        .min(1, { message: 'SubCategory slug is required!' }),
    }),
    body: categorySubCategorySchema.partial().extend({
      description: categorySubCategorySchema.shape.description,
    }),
  }),
};
