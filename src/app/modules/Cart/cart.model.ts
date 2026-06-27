import { model, Schema } from 'mongoose';
import { ICart, ICartItem, ICartItemSnapshot } from './cart.interface';

const cartItemSnapshotSchema = new Schema<ICartItemSnapshot>(
  {
    title: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true },
    categorySlug: { type: String },
    image: { type: String, required: true },
    sku: { type: String, required: true },
    slug: { type: String, required: true },
    price: { type: Number, required: true },
    sellingUnit: { type: String },
    stock: { type: Number },
    weightKg: { type: Number },
    isNoCOD: { type: Boolean },
  },
  { _id: false },
);

const cartItemSchema = new Schema<ICartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceSnapshot: { type: Number, required: true },
    productSnapshot: { type: cartItemSnapshotSchema, required: true },
  },
  { _id: false },
);

const cartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: { type: [cartItemSchema], default: [] },
    subtotal: { type: Number, required: true, default: 0 },
    totalItems: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

cartSchema.index({ user: 1 }, { unique: true, name: 'cart_user_unique_idx' });
cartSchema.index(
  { user: 1, updatedAt: -1 },
  { name: 'cart_user_updatedAt_idx' },
);

export const CartModel = model<ICart>('Cart', cartSchema);
