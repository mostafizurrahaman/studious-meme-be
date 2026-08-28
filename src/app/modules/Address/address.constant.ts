export const AddressTypes = {
  HOME: 'home',
  OFFICE: 'office',
  BUSINESS: 'business',
  WORK: 'work',
  OTHER: 'other',
} as const;

export const addressTypeValues = Object.values(AddressTypes);

export type TAddressType = (typeof AddressTypes)[keyof typeof AddressTypes];
