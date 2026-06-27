import { z } from 'zod';
import { PageSlugs, TPageSlugs } from './page.constant';

// 1. createOrUpdatePageSchema
const createOrUpdatePageSchema = z.object({
  body: z.object({
    slug: z
      .enum(Object.values(PageSlugs) as [TPageSlugs, ...TPageSlugs[]], {
        error: 'Slug is required',
      })
      .refine((val) => Object.values(PageSlugs).includes(val), {
        message: `Slug must be one of: ${Object.values(PageSlugs)
          .map((v) => `'${v}'`)
          .join(', ')}.`,
      }),

    title: z
      .string({ error: 'Title is required!' })
      .trim()
      .min(1, { message: 'Title is required!' })
      .min(3, { message: 'Title must be at least 3 characters long' }),

    content: z
      .string({ error: 'Content is required!' })
      .trim()
      .min(1, { message: 'Content is required!' })
      .min(10, { message: 'Content must be at least 10 characters long' }),
  }),
});

export const pageZodValidation = {
  createOrUpdatePageSchema,
};
