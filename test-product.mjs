/* eslint-disable no-console */
import { ProductValidation } from './src/app/modules/Product/product.validation.ts';

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

const result = ProductValidation.productCreateSchema.safeParse({
  body: validProductBase,
});

console.log('Success:', result.success);
if (!result.success) {
  console.log('Error:', result.error);
} else {
  console.log('Data:', result.data);
}
