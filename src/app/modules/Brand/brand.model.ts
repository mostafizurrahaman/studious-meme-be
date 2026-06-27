import { model, Schema } from 'mongoose';
import { IBrand } from './brand.interface';

const brandSchema = new Schema<IBrand>(
  {
    name: {
      type: String,
      required: [true, 'Brand name is required!'],
      index: true,
    },
    slug: {
      type: String,
      required: [true, 'Brand slug is required!'],
      unique: true,
    },
    image: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

brandSchema.index(
  { isActive: 1, createdAt: -1 },
  { name: 'brand_active_createdAt_idx' },
);
brandSchema.index(
  { isActive: 1, name: 1 },
  { name: 'brand_active_name_idx' },
);

export const BrandModel = model<IBrand>('Brand', brandSchema);
