import { model, Schema, Types } from 'mongoose';

type WishlistProductSnapshot = {
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

type WishlistHistoryDoc = {
  user: Types.ObjectId;
  product: Types.ObjectId;
  productSnapshot: WishlistProductSnapshot;
  createdAt?: Date;
  updatedAt?: Date;
};

const wishlistProductSnapshotSchema = new Schema<WishlistProductSnapshot>(
  {
    title: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true },
    images: { type: [String], required: true },
    sku: { type: String, required: true },
    slug: { type: String, required: true },
    price: { type: Number, required: true },
    sellingUnit: { type: String },
    stock: { type: Number },
  },
  { _id: false },
);

const wishlistHistorySchema = new Schema<WishlistHistoryDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productSnapshot: { type: wishlistProductSnapshotSchema, required: true },
  },
  { timestamps: true, versionKey: false },
);

wishlistHistorySchema.index({ user: 1, product: 1 }, { unique: true });
wishlistHistorySchema.index(
  { user: 1, updatedAt: -1 },
  { name: 'wishlistHistory_user_updatedAt_idx' },
);

export const WishlistHistoryModel = model<WishlistHistoryDoc>(
  'WishlistHistory',
  wishlistHistorySchema,
);
