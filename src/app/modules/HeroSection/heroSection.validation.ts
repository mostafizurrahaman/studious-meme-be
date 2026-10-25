import { z } from 'zod';

// 1. heroCardSchema (Legacy)
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

// 2. Atomic Hero Banner Validation
const bannerCreateSchema = z.object({
  body: z.object({
    title: z
      .string({ error: 'Title is required!' })
      .trim()
      .min(1, { message: 'Title is required!' }),
    description: z.string().trim().optional().default(''),
    image: z.string().optional(),
    imageAlt: z
      .string({ error: 'Image alt is required!' })
      .trim()
      .min(1, { message: 'Image alt is required!' }),
    clickUrl: z
      .string({ error: 'Click URL is required!' })
      .trim()
      .min(1, { message: 'Click URL is required!' }),
    slot: z.enum(['SLIDE', 'FEATURE'], {
      error: 'Slot must be either SLIDE or FEATURE!',
    }),
    order: z.number().int().optional().default(0),
    isActive: z.boolean().optional().default(true),
  }),
});

const bannerUpdateSchema = z.object({
  params: z.object({
    bannerId: z
      .string({ error: 'Banner ID is required!' })
      .trim()
      .min(1, { message: 'Banner ID is required!' }),
  }),
  body: z.object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    image: z.string().optional(),
    imageAlt: z.string().trim().min(1).optional(),
    clickUrl: z.string().trim().min(1).optional(),
    slot: z.enum(['SLIDE', 'FEATURE']).optional(),
    order: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
});

const bannerStatusSchema = z.object({
  params: z.object({
    bannerId: z
      .string({ error: 'Banner ID is required!' })
      .trim()
      .min(1, { message: 'Banner ID is required!' }),
  }),
  body: z.object({
    isActive: z.boolean({ error: 'isActive must be a boolean!' }),
  }),
});

const bannerReorderSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: z
            .string({ error: 'Banner ID is required!' })
            .trim()
            .min(1, { message: 'Banner ID is required!' }),
          order: z.number({ error: 'Order is required!' }).int(),
        }),
      )
      .min(1, { message: 'At least one item is required for reordering!' }),
  }),
});

// 3. Export HeroSectionValidation
export const HeroSectionValidation = {
  bannerCreateSchema,
  bannerUpdateSchema,
  bannerStatusSchema,
  bannerReorderSchema,
  // Legacy
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
