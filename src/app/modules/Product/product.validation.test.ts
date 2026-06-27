/* eslint-disable no-console */
import { describe, it, expect } from 'vitest';
import { ProductValidation } from './product.validation';

const validProductBase = {
  title: 'Test Product',
  slug: 'test-product',
  sku: 'TP-001',
  features: 'Great product features',
  description: 'A test product description',
  price: 1000,
  brand: '507f1f77bcf86cd799439011',
  category: '507f1f77bcf86cd799439012',
  weightKg: 1.5,
  rating: 4.5,
  images: ['https://example.com/img1.jpg'],
};

describe('Product Validation - Critical Paths', () => {
  describe('productCreateSchema', () => {
    it('should validate valid product data', () => {
      const result = ProductValidation.productCreateSchema.safeParse({
        body: validProductBase,
      });

      if (!result.success) {
        console.log(
          'Validation errors:',
          JSON.stringify(result.error?.issues, null, 2),
        );
      }

      expect(result.success).toBe(true);
    });

    it('should convert blank stock to null', () => {
      const result = ProductValidation.productCreateSchema.safeParse({
        body: { ...validProductBase, stock: '' },
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.body.stock).toBeNull();
      }
    });

    it('should reject product without title', () => {
      // eslint-disable-next-line unused-imports/no-unused-vars
      const { title, ...dataWithoutTitle } = validProductBase;
      const result = ProductValidation.productCreateSchema.safeParse({
        body: dataWithoutTitle,
      });

      expect(result.success).toBe(false);
    });

    it('should reject negative price', () => {
      const result = ProductValidation.productCreateSchema.safeParse({
        body: { ...validProductBase, price: -100 },
      });

      expect(result.success).toBe(false);
    });

    it('should validate product with oldPrice', () => {
      const result = ProductValidation.productCreateSchema.safeParse({
        body: { ...validProductBase, oldPrice: 1200 },
      });

      if (!result.success) {
        console.log(
          'oldPrice errors:',
          JSON.stringify(result.error?.issues, null, 2),
        );
      }

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.oldPrice).toBe(1200);
      }
    });

    it('should reject invalid YouTube video URL', () => {
      const result = ProductValidation.productCreateSchema.safeParse({
        body: {
          ...validProductBase,
          youtubeVideoUrl: 'https://invalid-url.com',
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('productUpdateSchema', () => {
    it('should validate partial product update', () => {
      const result = ProductValidation.productUpdateSchema.safeParse({
        params: { slug: 'test-product' },
        body: {
          title: 'Updated Product',
          price: 2000,
        },
      });

      expect(result.success).toBe(true);
    });

    it('should require slug in params', () => {
      const result = ProductValidation.productUpdateSchema.safeParse({
        body: {
          title: 'Updated Product',
        },
      });

      expect(result.success).toBe(false);
    });

    it('should allow partial update without all fields', () => {
      const result = ProductValidation.productUpdateSchema.safeParse({
        params: { slug: 'test-product' },
        body: { price: 1500 },
      });

      expect(result.success).toBe(true);
    });

    it('should convert blank stock to null on update', () => {
      const result = ProductValidation.productUpdateSchema.safeParse({
        params: { slug: 'test-product' },
        body: { stock: '' },
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.body.stock).toBeNull();
      }
    });
  });
});
