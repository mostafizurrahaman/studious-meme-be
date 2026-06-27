import { Document, Types } from 'mongoose';

export interface ICartItemSnapshot {
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
}

export interface ICartItem {
  product: Types.ObjectId;
  quantity: number;
  priceSnapshot: number;
  productSnapshot: ICartItemSnapshot;
}

export interface ICart extends Document {
  user: Types.ObjectId;
  items: ICartItem[];
  subtotal: number;
  totalItems: number;
  createdAt: Date;
  updatedAt: Date;
}
