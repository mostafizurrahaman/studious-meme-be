import { model, Schema, Types } from 'mongoose';

const HISTORY_TTL_SECONDS = 60 * 60 * 24 * 30;

type WishlistHistoryEventDoc = {
  user: Types.ObjectId;
  product: Types.ObjectId;
  productSnapshot: {
    title: string;
    brand: string;
    category: string;
    categorySlug?: string;
    images: string[];
    sku: string;
    slug: string;
    price: number;
    sellingUnit?: string;
    stock?: number | null;
    weightKg?: number;
    isNoCOD?: boolean;
  };
  action: 'add' | 'remove';
  expireAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

const wishlistHistoryEventSchema = new Schema<WishlistHistoryEventDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productSnapshot: {
      title: { type: String, required: true },
      brand: { type: String, required: true },
      category: { type: String, required: true },
      categorySlug: { type: String },
      images: { type: [String], required: true },
      sku: { type: String, required: true },
      slug: { type: String, required: true },
      price: { type: Number, required: true },
      sellingUnit: { type: String },
      stock: { type: Number },
      weightKg: { type: Number },
      isNoCOD: { type: Boolean },
    },
    action: { type: String, enum: ['add', 'remove'], required: true },
    expireAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + HISTORY_TTL_SECONDS * 1000),
    },
  },
  { timestamps: true, versionKey: false },
);

wishlistHistoryEventSchema.index(
  { expireAt: 1 },
  { expireAfterSeconds: 0, name: 'wishlistHistoryEvent_ttl_idx' },
);

wishlistHistoryEventSchema.index(
  { user: 1, createdAt: -1 },
  { name: 'wishlistHistoryEvent_user_createdAt_idx' },
);

wishlistHistoryEventSchema.index(
  { 'productSnapshot.category': 1, createdAt: -1 },
  { name: 'wishlistHistoryEvent_category_createdAt_idx' },
);

export const WishlistHistoryEventModel = model<WishlistHistoryEventDoc>(
  'WishlistHistoryEvent',
  wishlistHistoryEventSchema,
);
