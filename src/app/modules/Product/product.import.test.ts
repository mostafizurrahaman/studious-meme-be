/* eslint-disable no-console */
import { describe, it, expect } from 'vitest';
import { ProductValidation } from './product.validation';

describe('ProductValidation Import Check', () => {
  it('should import ProductValidation', () => {
    console.log('ProductValidation:', typeof ProductValidation);
    console.log(
      'productCreateSchema:',
      typeof ProductValidation?.productCreateSchema,
    );
    expect(ProductValidation).toBeDefined();
    expect(ProductValidation.productCreateSchema).toBeDefined();
  });

  it('should have safeParse method', () => {
    const schema = ProductValidation.productCreateSchema;
    console.log('safeParse type:', typeof schema?.safeParse);
    expect(typeof schema?.safeParse).toBe('function');
  });
});
