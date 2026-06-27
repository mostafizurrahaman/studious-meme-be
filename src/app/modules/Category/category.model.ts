import { model, Schema } from 'mongoose';
import { ICategory } from './category.interface';

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required!'],
      unique: [true, 'Category name must be unique!'],
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required!'],
      unique: [true, 'Category slug must be unique!'],
    },
    subCategories: {
      type: [
        new Schema(
          {
            name: {
              type: String,
              required: [true, 'SubCategory name is required!'],
            },
            slug: {
              type: String,
              required: [true, 'SubCategory slug is required!'],
            },
            image: { type: String },
            description: { type: String },
            accent: { type: String },
            isActive: { type: Boolean, default: true },
          },
          { _id: false },
        ),
      ],
      default: [],
      validate: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        validator: function (value: any[]) {
          const names = value.map((v) => v.name);
          const slugs = value.map((v) => v.slug);

          return (
            new Set(names).size === names.length &&
            new Set(slugs).size === slugs.length
          );
        },
        message: 'SubCategory name and slug must be unique within a category!',
      },
    },
    image: { type: String },
    description: { type: String },
    accent: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

categorySchema.index(
  { isActive: 1, createdAt: -1 },
  { name: 'category_active_createdAt_idx' },
);
categorySchema.index(
  { isActive: 1, name: 1 },
  { name: 'category_active_name_idx' },
);
categorySchema.index(
  { isActive: 1, 'subCategories.slug': 1 },
  { name: 'category_active_subCategorySlug_idx' },
);

export const CategoryModel = model<ICategory>('Category', categorySchema);
