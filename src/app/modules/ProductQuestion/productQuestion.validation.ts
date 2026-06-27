import { z } from 'zod';

const objectIdSchema = z
  .string({ error: 'ID is required!' })
  .trim()
  .min(1, { message: 'ID is required!' });

const questionBodySchema = z.object({
  product: objectIdSchema,
  question: z
    .string({ error: 'Question is required!' })
    .trim()
    .min(1, { message: 'Question is required!' })
    .max(1000, { message: 'Question cannot exceed 1000 characters!' }),
});

const answerBodySchema = z.object({
  answer: z
    .string({ error: 'Answer is required!' })
    .trim()
    .min(1, { message: 'Answer is required!' })
    .max(2000, { message: 'Answer cannot exceed 2000 characters!' }),
});

const statusBodySchema = z.object({
  status: z.enum(['pending', 'answered', 'hidden']),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['pending', 'answered', 'hidden']).optional(),
  product: z.string().trim().optional(),
  user: z.string().trim().optional(),
  searchTerm: z.string().trim().optional(),
  sort: z
    .enum([
      'createdAt-desc',
      'createdAt-asc',
      'answeredAt-desc',
      'answeredAt-asc',
      'status-desc',
      'status-asc',
    ])
    .optional(),
});

const publicQuestionListSchema = z.object({
  params: z.object({
    productId: objectIdSchema,
  }),
  query: listQuerySchema.pick({ page: true, limit: true, sort: true }),
});

const adminQuestionListSchema = z.object({
  query: listQuerySchema,
});

const questionIdParamsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

const createQuestionSchema = z.object({
  body: questionBodySchema,
});

const answerQuestionSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: answerBodySchema,
});

const updateQuestionStatusSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: statusBodySchema,
});

export const ProductQuestionValidation = {
  createQuestionSchema,
  publicQuestionListSchema,
  adminQuestionListSchema,
  questionIdParamsSchema,
  answerQuestionSchema,
  updateQuestionStatusSchema,
};
