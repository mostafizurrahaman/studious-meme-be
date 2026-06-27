/* eslint-disable no-console */
import { describe, it, expect } from 'vitest';
import { ProductValidation } from './product.validation';

describe('Debug ProductValidation', () => {
  it('should check safeParse result properties', () => {
    const schema = ProductValidation.productCreateSchema;
    const testData = {
      body: {
        title: 'Test',
        slug: 'test',
        sku: 'TP-001',
        features: 'Features',
        description: 'Desc',
        price: 100,
        brand: '507f1f77bcf86cd799439011',
        category: '507f1f77bcf86cd799439012',
        weightKg: 1.5,
        rating: 4.5,
      },
    };

    const result = schema.safeParse(testData);
    console.log('Result keys:', Object.keys(result));
    console.log('Success:', result.success);

    if ('error' in result) {
      console.log('Error:', result.error);
    }
    if ('errors' in result) {
      console.log('Errors:', result.errors);
    }

    expect(result.success).toBe(true);
  });
});
