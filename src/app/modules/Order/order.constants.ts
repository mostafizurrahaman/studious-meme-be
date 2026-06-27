export const COD_MIN_SUBTOTAL_BDT = 1000;

export const DELIVERY_AREA = {
  INSIDE_DHAKA: 'INSIDE_DHAKA',
  OUTSIDE_DHAKA: 'OUTSIDE_DHAKA',
} as const;

export type TDeliveryArea = (typeof DELIVERY_AREA)[keyof typeof DELIVERY_AREA];

export const SHIPPING_ZONE = {
  INSIDE_DHAKA: 'inside_dhaka',
  OUTSIDE_DHAKA: 'outside_dhaka',
} as const;

export type TShippingZone = (typeof SHIPPING_ZONE)[keyof typeof SHIPPING_ZONE];

export const SHIPPING_RULES = {
  [SHIPPING_ZONE.INSIDE_DHAKA]: {
    baseCharge: 80,
    additionalCharge: 20,
  },
  [SHIPPING_ZONE.OUTSIDE_DHAKA]: {
    baseCharge: 130,
    additionalCharge: 30,
  },
} as const;

export const COD_REASONS = {
  subtotal: 'COD is not available for orders of 1000 BDT or below.',
  blockedByProduct:
    'COD is not available for one or more products in your cart.',
} as const;
