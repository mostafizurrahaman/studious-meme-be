import { z } from 'zod';
import { addressTypeValues } from './address.constant';

const addressBaseSchema = z.object({
  fullName: z
    .string({ error: 'Full name is required.' })
    .trim()
    .min(2, { message: 'Full name must be at least 2 characters long.' }),
  phoneNumber: z
  .string()
  .regex(
    /^01[3-9]\d{8}$/,
    'Please enter a valid Bangladesh phone number starting with 01.',
  ),
  email: z
    .string({ error: 'Email is required.' })
    .trim()
    .email({ message: 'Invalid email address.' })
    .toLowerCase(),
  district: z
    .string({ error: 'District is required.' })
    .trim()
    .min(1, { message: 'District is required.' }),
  deliveryAddress: z
    .string({ error: 'Delivery address is required.' })
    .trim()
    .min(5, {
      message: 'Delivery address must be at least 5 characters long.',
    }),
  type: z.enum(addressTypeValues as [string, ...string[]], {
    error: `Address type should be one of: ${addressTypeValues.join(', ')}`,
  }),
  isDefault: z.boolean().optional(),
});

const createAddressSchema = z.object({
  body: addressBaseSchema,
});

const updateAddressSchema = z.object({
  params: z.object({
    addressId: z
      .string({ error: 'Address ID is required.' })
      .trim()
      .min(1, { message: 'Address ID is required.' }),
  }),
  body: addressBaseSchema.partial(),
});

const addressIdParamsSchema = z.object({
  params: z.object({
    addressId: z
      .string({ error: 'Address ID is required.' })
      .trim()
      .min(1, { message: 'Address ID is required.' }),
  }),
});

export const AddressValidation = {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamsSchema,
};
