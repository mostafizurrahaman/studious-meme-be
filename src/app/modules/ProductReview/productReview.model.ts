import { model, Schema } from 'mongoose';
import { IProductReview } from './productReview.interface';

const productReviewSchema = new Schema<IProductReview>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required!'],
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required!'],
      trim: true,
      maxlength: 100,
    },
    displayImage: {
      type: String,
      required: [true, 'Display image is required!'],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required!'],
      min: 1,
      max: 5,
      index: true,
    },
    comment: {
      type: String,
      required: [true, 'Comment is required!'],
      trim: true,
      maxlength: 2000,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) =>
          Array.isArray(value) && value.length <= 5,
        message: 'You can upload up to 5 review images!',
      },
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
      index: true,
    },
    source: {
      type: String,
      enum: ['customer', 'manual'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'hidden'],
      default: 'pending',
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    rejectedAt: {
      type: Date,
    },
    hiddenBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    hiddenAt: {
      type: Date,
    },
  },
  { timestamps: true, versionKey: false },
);

productReviewSchema.index(
  { product: 1, status: 1, createdAt: -1 },
  { name: 'product_review_product_status_createdAt_idx' },
);
productReviewSchema.index(
  { user: 1, product: 1 },
  { name: 'product_review_user_product_idx' },
);
productReviewSchema.index(
  { source: 1, createdAt: -1 },
  { name: 'product_review_source_createdAt_idx' },
);
productReviewSchema.index(
  { status: 1, createdAt: -1 },
  { name: 'product_review_status_createdAt_idx' },
);
productReviewSchema.index(
  { rating: 1, createdAt: -1 },
  { name: 'product_review_rating_createdAt_idx' },
);
productReviewSchema.index(
  { product: 1, user: 1, source: 1 },
  {
    unique: true,
    partialFilterExpression: { source: 'customer', user: { $exists: true } },
    name: 'product_review_customer_unique_idx',
  },
);

export const ProductReviewModel = model<IProductReview>(
  'ProductReview',
  productReviewSchema,
);
