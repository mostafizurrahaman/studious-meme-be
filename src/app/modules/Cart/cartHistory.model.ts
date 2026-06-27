import { model, Schema, Types } from 'mongoose';

const HISTORY_TTL_SECONDS = 60 * 60 * 24 * 30;

type CartHistoryDoc = {
  user: Types.ObjectId;
  product?: Types.ObjectId;
  action: 'add' | 'update' | 'remove' | 'clear';
  quantity?: number;
  productSnapshot?: {
    title: string;
    brand: string;
    category: string;
    categorySlug?: string;
    image: string;
    sku: string;
    slug: string;
    price: number;
    sellingUnit?: string;
    stock?: number | null;
    weightKg?: number;
    isNoCOD?: boolean;
  };
  expireAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

const cartHistorySchema = new Schema<CartHistoryDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    action: {
      type: String,
      enum: ['add', 'update', 'remove', 'clear'],
      required: true,
    },
    quantity: { type: Number },
    productSnapshot: {
      title: { type: String },
      brand: { type: String },
      category: { type: String },
      categorySlug: { type: String },
      image: { type: String },
      sku: { type: String },
      slug: { type: String },
      price: { type: Number },
      sellingUnit: { type: String },
      stock: { type: Number },
      weightKg: { type: Number },
      isNoCOD: { type: Boolean },
    },
    expireAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + HISTORY_TTL_SECONDS * 1000),
    },
  },
  { timestamps: true, versionKey: false },
);

cartHistorySchema.index(
  { expireAt: 1 },
  { expireAfterSeconds: 0, name: 'cartHistory_ttl_idx' },
);

cartHistorySchema.index(
  { user: 1, createdAt: -1 },
  { name: 'cartHistory_user_createdAt_idx' },
);

cartHistorySchema.index(
  { 'productSnapshot.category': 1, createdAt: -1 },
  { name: 'cartHistory_category_createdAt_idx' },
);

export const CartHistoryModel = model<CartHistoryDoc>(
  'CartHistory',
  cartHistorySchema,
);
