import { model, Schema } from 'mongoose';
import { IProduct } from './product.interface';
import { DEFAULT_SELLING_UNIT } from './selling-unit';

export type { IProduct } from './product.interface';

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: [true, 'Product title is required!'] },
    slug: {
      type: String,
      required: [true, 'Product slug is required!'],
      unique: true,
    },
    sku: { type: String, required: [true, 'SKU is required!'], unique: true },
    images: {
      type: [String],
      required: [true, 'At least one product image is required!'],
      validate: {
        validator: (value: string[]) =>
          Array.isArray(value) && value.length > 0 && value.length <= 5,
        message: 'Product images must be between 1 and 5 items!',
      },
    },
    features: { type: String, required: [true, 'Features are required!'] },
    description: {
      type: String,
      required: [true, 'Description is required!'],
    },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0 },
    badge: { type: String },
    youtubeVideoUrl: { type: String },
    youtubeVideoId: { type: String },
    brand: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    subCategorySlug: { type: String, index: true },
    weightKg: { type: Number, required: true, min: 0.01, default: 1 },
    sellingUnit: { type: String, trim: true, default: DEFAULT_SELLING_UNIT },
    stock: { type: Number, min: 0, default: null },
    rating: { type: Number, required: true, min: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
    isNoCOD: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

productSchema.index(
  { isActive: 1, category: 1, brand: 1, createdAt: -1 },
  { name: 'product_active_category_brand_createdAt_idx' },
);
productSchema.index(
  { isActive: 1, subCategorySlug: 1, createdAt: -1 },
  { name: 'product_active_subCategory_createdAt_idx' },
);
productSchema.index(
  { isActive: 1, isFeatured: 1, createdAt: -1 },
  { name: 'product_active_featured_createdAt_idx' },
);
productSchema.index(
  { isActive: 1, isFeatured: 1, updatedAt: -1 },
  { name: 'product_active_featured_updatedAt_idx' },
);
productSchema.index(
  { isActive: 1, isNoCOD: 1, createdAt: -1 },
  { name: 'product_active_noCod_createdAt_idx' },
);

export const ProductModel = model<IProduct>('Product', productSchema);
