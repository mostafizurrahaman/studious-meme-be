import { z } from 'zod';

const passwordSchema = () =>
  z
    .string({ error: 'Password is required!' })
    .trim()
    .min(6, { message: 'Password must be at least 6 characters long.' })
    .max(20, { message: 'Password must be between 6 and 20 characters.' });

// 1. adminCreateSchema
const adminCreateSchema = z.object({
  body: z.object({
    name: z
      .string({ error: 'Name is required!' })
      .trim()
      .min(3, { message: 'Name must be at least 3 characters long!' }),
    email: z
      .string({ error: 'Email is required!' })
      .trim()
      .email({ message: 'Invalid email format!' })
      .transform((v) => v.toLowerCase()),
    password: passwordSchema(),
    phone: z.string().optional(),
    image: z.string().optional(),
  }),
});

// 2. adminUpdateSchema
const adminUpdateSchema = z.object({
  params: z.object({
    userId: z
      .string({ error: 'User ID is required!' })
      .trim()
      .min(1, { message: 'User ID is required!' }),
  }),
  body: z.object({
    name: z
      .string()
      .trim()
      .min(3, { message: 'Name must be at least 3 characters long!' })
      .optional(),
    email: z
      .string({ error: 'Email is required!' })
      .trim()
      .email({ message: 'Invalid email format!' })
      .transform((v) => v.toLowerCase())
      .optional(),
    phone: z.string().optional(),
    image: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const AdminValidation = {
  adminCreateSchema,
  adminUpdateSchema,
};
