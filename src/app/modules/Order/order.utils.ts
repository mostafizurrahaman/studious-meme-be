import {
  COD_MIN_SUBTOTAL_BDT,
  COD_REASONS,
  DELIVERY_AREA,
  SHIPPING_RULES,
  SHIPPING_ZONE,
  type TDeliveryArea,
  type TShippingZone,
} from './order.constants';
import { TPaymentMethod } from './order.interface';

export type CodEligibilityInput = {
  subtotal: number;
  itemBlocksCod: boolean;
};

const normalizeDeliveryArea = (value?: TShippingZone | TDeliveryArea) => {
  if (
    value === DELIVERY_AREA.INSIDE_DHAKA ||
    value === SHIPPING_ZONE.INSIDE_DHAKA
  ) {
    return SHIPPING_ZONE.INSIDE_DHAKA;
  }

  return SHIPPING_ZONE.OUTSIDE_DHAKA;
};

export function normalizeText(value?: string) {
  return (value ?? '').trim().toLowerCase();
}

export function deriveShippingZone(city?: string): TShippingZone {
  const selectedDistrict = normalizeText(city);

  return selectedDistrict === 'dhaka'
    ? SHIPPING_ZONE.INSIDE_DHAKA
    : SHIPPING_ZONE.OUTSIDE_DHAKA;
}

export function calculateShippingCharge({
  totalWeightKg,
  deliveryArea,
  zone,
}: {
  totalWeightKg: number;
  deliveryArea?: TShippingZone | TDeliveryArea;
  zone?: TShippingZone;
}) {
  const rules = SHIPPING_RULES[normalizeDeliveryArea(deliveryArea ?? zone)];

  if (!Number.isFinite(totalWeightKg) || totalWeightKg <= 0) {
    return 0;
  }

  if (totalWeightKg <= 1) {
    return rules.baseCharge;
  }

  const extraKg = Math.ceil(totalWeightKg - 1);
  return rules.baseCharge + extraKg * rules.additionalCharge;
}

export function calculateCodEligibility({
  subtotal,
  itemBlocksCod,
}: CodEligibilityInput) {
  const reasons: string[] = [];

  if (!Number.isFinite(subtotal) || subtotal <= COD_MIN_SUBTOTAL_BDT) {
    reasons.push(COD_REASONS.subtotal);
  }

  if (itemBlocksCod) {
    reasons.push(COD_REASONS.blockedByProduct);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    codAvailable: reasons.length === 0,
    codUnavailableReasons: reasons,
  };
}

export function normalizePaymentMethod(value: string): TPaymentMethod {
  return value === 'COD' ? 'CASH_ON_DELIVERY' : (value as TPaymentMethod);
}

export function formatShippingZoneLabel(zone: TShippingZone) {
  return zone === SHIPPING_ZONE.INSIDE_DHAKA ? 'Inside Dhaka' : 'Outside Dhaka';
}

export function getTotalWeightKg(totalWeightKg: number) {
  return Number(totalWeightKg.toFixed(2));
}
