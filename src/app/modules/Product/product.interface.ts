import { Types } from 'mongoose';

import type { SellingUnit } from './selling-unit';

export interface IProduct {
  title: string;
  slug: string;
  sku: string;
  images: string[];
  imageAlt: string[];
  features: string;
  description: string;
  metaTitle?: string;
  metaDescription?: string;
  price: number;
  oldPrice?: number;
  badge?: string;
  youtubeVideoUrl?: string;
  youtubeVideoId?: string;
  brand: Types.ObjectId;
  brandName: string;
  category: Types.ObjectId;
  categoryName: string;
  subCategorySlug?: string;
  subCategoryName?: string;
  weightKg: number;
  stock?: number | null;
  rating: number;
  sellingUnit?: SellingUnit;
  isFeatured: boolean;
  isNoCOD: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
