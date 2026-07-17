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
  metaTitle: z
    .string({
      error: () => 'Meta title is required!',
    })
    .optional(),
  metaDescription: z
    .string({
      error: () => 'Meta description is required!',
    })
    .optional(),
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
  metaTitle: z
    .string({
      error: () => 'Meta title is required!',
    })
    .optional(),
  metaDescription: z
    .string({
      error: () => 'Meta description is required!',
    })
    .optional(),

  description: z
    .string({ error: 'Category description is required!' })
    .trim()
    .min(1, { message: 'Category description is required!' }),
  accent: z.string().optional(),
  isActive: z.boolean().optional(),
});

const subCategoriesSortingFields = [
  'subCategorySlug',
  'subCategoryName',
  'totalProducts',
  'inActiveProducts',
  'activeProducts',
];

const getAllSubCategories = z.object({
  query: z
    .object({
      page: z.coerce
        .number({
          error: 'Page is required',
        })
        .min(1, {
          error: 'Page should be positive number!',
        })
        .optional()
        .default(1),
      limit: z.coerce
        .number({
          error: 'Limit is required',
        })
        .min(1, {
          error: 'Limit should be positive number!',
        })
        .optional()
        .default(10),
      searchTerm: z
        .string({ error: 'SearchTerm slug is required!' })
        .optional(),
      sortBy: z
        .enum(subCategoriesSortingFields, {
          error: `Sort By will be ${subCategoriesSortingFields.join(',')}`,
        })
        .optional(),
      sortOrder: z
        .enum(['asc', 'desc'], {
          error: `Sort By will be asc,desc`,
        })
        .optional(),
      categoryId: z
        .string({
          error: 'CategoryId should be string',
        })
        .optional(),
      categorySlug: z
        .string({
          error: 'CategoryId should be string',
        })
        .optional(),
      includeInActive: z.coerce
        .boolean({
          error: 'Included inactive should be boolean!',
        })
        .transform(val => Boolean(val))
        .default(false)
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data.categoryId && data.categorySlug) {
        ctx.addIssue({
          code: 'custom',
          message: `Provide only one of these two fields: 'categoryId' or 'categorySlug'.`,
          path: ['categorySlug'],
        });
      }
    }),
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
  getAllSubCategories,
};

export type TGetAllSubCategoriesQueryType = z.infer<
  typeof getAllSubCategories.shape.query
>;
