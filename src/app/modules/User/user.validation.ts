import { z } from 'zod';

// Reusable validators
export const zodEnumFromObject = <T extends Record<string, string>>(obj: T) =>
  z.enum([...Object.values(obj)] as [string, ...string[]]);

const passwordSchema = (label: string) =>
  z
    .string({ error: `${label} is required!` })
    .trim()
    .min(6, { message: 'Password must be at least 6 characters long.' })
    .max(20, { message: 'Password must be between 6 and 20 characters.' });

// 1. createUserSchema
const createUserSchema = z.object({
  body: z
    .object({
      name: z
        .string({ error: 'Name is required!' })
        .trim()
        .min(3, { message: 'Name must be at least 3 characters long!' }),

      // phone: z
      //   .string({ error: 'Phone number is required!' })
      //   .trim()
      //   .regex(/^[0-9+]+$/, { message: 'Invalid phone number format!' })
      //   .min(10, { message: 'Phone number must be at least 10 digits!' }),

      email: z
        .string({ error: 'Email is required!' })
        .trim()
        .email({ message: 'Invalid email format!' }) // Ensure it's a valid email
        .transform((email) => email.toLowerCase()) // Convert email to lowercase
        .refine((email) => email !== '', { message: 'Email is required!' }) // Check that email is not empty
        .refine((value) => typeof value === 'string', {
          message: 'Email must be string!', // Check that email is string
        }),

      password: passwordSchema('Password'),
    })
    .passthrough(),
});

// 2. sendSignupOtpAgainSchema
const sendSignupOtpAgainSchema = z.object({
  body: z.object({
    userEmail: z
      .string({ error: 'Email is required!' })
      .trim()
      .email({ message: 'Invalid email format!' }) // Ensure it's a valid email
      .transform((email) => email.toLowerCase()) // Convert email to lowercase
      .refine((email) => email !== '', { message: 'Email is required!' }) // Check that email is not empty
      .refine((value) => typeof value === 'string', {
        message: 'Email must be string!', // Check that email is string
      }),
  }),
});

// 3. verifySignupOtpSchema
const verifySignupOtpSchema = z.object({
  body: z.object({
    userEmail: z
      .string({ error: 'Email is required!' })
      .trim()
      .email({ message: 'Invalid email format!' }) // Ensure it's a valid email
      .transform((email) => email.toLowerCase()) // Convert email to lowercase
      .refine((email) => email !== '', { message: 'Email is required!' }) // Check that email is not empty
      .refine((value) => typeof value === 'string', {
        message: 'Email must be string!', // Check that email is string
      }),

    otp: z
      .string({
        error: 'OTP is required!',
      })
      .min(6, { message: 'OTP must be at least 6 characters long!' })
      .max(6, { message: 'OTP cannot exceed 6 characters!' }),
  }),
});

// 4. signinSchema
const signinSchema = z.object({
  body: z.object({
    email: z
      .string({ error: 'Email is required!' })
      .trim()
      .email({ message: 'Invalid email format!' }) // Ensure it's a valid email
      .transform((email) => email.toLowerCase()) // Convert email to lowercase
      .refine((email) => email !== '', { message: 'Email is required!' }) // Check that email is not empty
      .refine((value) => typeof value === 'string', {
        message: 'Email must be string!', // Check that email is string
      }),

    password: passwordSchema('Password'),
  }),
});

// 5. updateProfileDataSchema
const updateProfileDataSchema = z.object({
  body: z.object({
    name: z
      .string({ error: 'Name is required!' })
      .trim()
      .min(3, { message: 'Name must be at least 3 characters long!' }),

    phone: z
      .string({ error: 'Phone number is required!' })
      .trim()
      .regex(/^[0-9+]+$/, { message: 'Invalid phone number format!' })
      .min(10, { message: 'Phone number must be at least 10 digits!' }),

    // Validates if the string is a valid ISO 8601 date format
    dob: z
      .string({ error: 'Date of birth is required!' })
      .datetime({ message: 'Invalid ISO date format!' })
      .transform((val) => new Date(val)), // Converts the string to a Date object automatically
  }),
});

// 6. changePasswordSchema
const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: passwordSchema('Old password'),

    newPassword: passwordSchema('New password'),
  }),
});

// 7. forgotPasswordSchema
const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ error: 'Email is required!' })
      .trim()
      .email({ message: 'Invalid email format!' }) // Ensure it's a valid email
      .transform((email) => email.toLowerCase()) // Convert email to lowercase
      .refine((email) => email !== '', { message: 'Email is required!' }) // Check that email is not empty
      .refine((value) => typeof value === 'string', {
        message: 'Email must be string!', // Check that email is string
      }),
  }),
});

// 8. sendForgotPasswordOtpAgainSchema
const sendForgotPasswordOtpAgainSchema = z.object({
  body: z.object({
    token: z.string({ error: 'Token is required!' }),
  }),
});

// 9. verifyOtpForForgotPasswordSchema
const verifyOtpForForgotPasswordSchema = z.object({
  body: z.object({
    token: z.string({ error: 'Token is required!' }),
    otp: z
      .string({
        error: 'OTP is required!',
      })
      .regex(/^\d+$/, { message: 'OTP must be a number!' })
      .length(6, { message: 'OTP must be exactly 6 digits' }),
  }),
});

// 10. resetPasswordSchema
const resetPasswordSchema = z.object({
  body: z.object({
    resetPasswordToken: z.string({ error: 'Token is required!' }),

    newPassword: passwordSchema('New password'),
  }),
});

// 11. getNewAccessTokenSchema
const getNewAccessTokenSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({
      error: 'Refresh token is required!',
    }),
  }),
});

// 12. deactivateUserAccountSchema
const deactivateUserAccountSchema = z.object({
  body: z
    .object({
      email: z
        .string({ error: 'Email is required!' })
        .trim()
        .email('Invalid email format!')
        .transform((email) => email.toLowerCase())
        .refine((email) => email !== '', {
          message: 'Email is required!',
        })
        .refine((value) => typeof value === 'string', {
          message: 'Email must be string!',
        }),

      password: passwordSchema('Password'),

      deactivationReason: z
        .string({
          error: 'Deactivation reason is required!',
        })
        .min(3, 'Reason must be at least 3 characters!')
        .max(200, 'Reason cannot exceed 200 characters!'),
    })
    .strict(),
});

// 13. adminUpdateUserStatusSchema
const adminUpdateUserStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean({ error: 'isActive is required!' }),
  }),
});

export const UserValidation = {
  createUserSchema,
  sendSignupOtpAgainSchema,
  verifySignupOtpSchema,
  signinSchema,
  updateProfileDataSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  sendForgotPasswordOtpAgainSchema,
  verifyOtpForForgotPasswordSchema,
  resetPasswordSchema,
  getNewAccessTokenSchema,
  deactivateUserAccountSchema,
  adminUpdateUserStatusSchema,
};
