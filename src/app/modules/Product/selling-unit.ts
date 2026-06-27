export const SELLING_UNIT_OPTIONS = [
  'pcs',
  'set',
  'pair',
  'box',
  'pack',
  'roll',
  'meter',
  'feet',
  'kg',
  'gram',
  'liter',
  'ml',
  'bag',
  'bundle',
  'dozen',
] as const;

export type SellingUnit = (typeof SELLING_UNIT_OPTIONS)[number];

export const DEFAULT_SELLING_UNIT: SellingUnit = 'pcs';

const SELLING_UNIT_SET = new Set<string>(SELLING_UNIT_OPTIONS);

const isSellingUnit = (value: string): value is SellingUnit =>
  SELLING_UNIT_SET.has(value);

export const normalizeSellingUnitInput = (value: unknown) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const normalizeSellingUnit = (
  value: unknown,
): SellingUnit | undefined => {
  const normalized = normalizeSellingUnitInput(value);

  return typeof normalized === 'string' && isSellingUnit(normalized)
    ? normalized
    : undefined;
};
