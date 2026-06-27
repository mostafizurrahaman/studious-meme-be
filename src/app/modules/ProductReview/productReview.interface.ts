import { Document, Types } from 'mongoose';

export type TReviewSource = 'customer' | 'manual';
export type TReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export interface IProductReview extends Document {
  product: Types.ObjectId;
  user?: Types.ObjectId;

  // admin/super-admin can also create reviews on behalf of customers, so this field is optional
  createdBy?: Types.ObjectId;

  displayName: string;
  displayImage: string;

  rating: number;
  comment: string;
  images: string[];

  isVerifiedPurchase: boolean;

  // customer or manual
  source: TReviewSource;

  // pending, approved, rejected, hidden
  status: TReviewStatus;

  approvedBy?: Types.ObjectId;
  approvedAt?: Date;

  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;

  hiddenBy?: Types.ObjectId;
  hiddenAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}
