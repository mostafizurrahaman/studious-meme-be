export const toPositiveNumber = (
  value: unknown,
  defaultValue: number,
): number => {
  const num = Number(value);

  return Number.isFinite(num) && num > 0 ? num : defaultValue;
};
