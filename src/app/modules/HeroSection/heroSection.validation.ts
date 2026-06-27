import { z } from 'zod';

// 1. heroCardSchema
const heroCardSchema = z.object({
  image: z.string().optional(),
  imageAlt: z
    .string({ error: 'Image alt is required!' })
    .trim()
    .min(1, { message: 'Image alt is required!' }),
  title: z
    .string({ error: 'Title is required!' })
    .trim()
    .min(1, { message: 'Title is required!' }),
  description: z
    .string({ error: 'Description is required!' })
    .trim()
    .min(1, { message: 'Description is required!' }),
  clickUrl: z
    .string({ error: 'Click URL is required!' })
    .trim()
    .min(1, { message: 'Click URL is required!' }),
});

// 2. HeroSectionValidation
export const HeroSectionValidation = {
  heroSectionCreateSchema: z.object({
    body: z.object({
      slides: z.array(heroCardSchema).default([]),
      features: z.array(heroCardSchema).default([]),
      isActive: z.boolean().optional(),
    }),
  }),
  heroSectionUpdateSchema: z.object({
    body: z.object({
      slides: z.array(heroCardSchema).optional(),
      features: z.array(heroCardSchema).optional(),
      isActive: z.boolean().optional(),
    }),
    params: z.object({
      heroSectionId: z
        .string({ error: 'Hero section ID is required!' })
        .trim()
        .min(1, { message: 'Hero section ID is required!' }),
    }),
  }),
};
