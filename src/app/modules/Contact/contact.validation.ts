import { z } from 'zod';

const optionalTrimmedString = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().optional(),
);

// 1. createContactValidation
export const createContactValidation = z.object({
  body: z.object({
    name: z
      .string({ error: 'Full name is required.' })
      .trim()
      .min(1, { message: 'Full name is required.' }),

    company: optionalTrimmedString,

    email: z
      .string({ error: 'Email address is required.' })
      .trim()
      .min(1, { message: 'Email address is required.' })
      .email({ message: 'Please enter a valid email address.' })
      .transform((email) => email.toLowerCase()),

    phone: z
      .string({ error: 'Phone number is required.' })
      .trim()
      .min(1, { message: 'Phone number is required.' }),

    subject: z
      .string({ error: 'Subject is required.' })
      .trim()
      .min(3, { message: 'Subject must be at least 3 characters long.' }),

    products: z
      .string({ error: 'Interested products are required.' })
      .trim()
      .min(1, { message: 'Please add at least one product or specification.' }),

    brand: optionalTrimmedString,

    message: z
      .string({ error: 'Project details are required.' })
      .trim()
      .min(20, {
        message:
          'Please add project details or delivery requirements (minimum 20 characters).',
      }),
  }),
});

export const ContactValidation = {
  createContactValidation,
};
