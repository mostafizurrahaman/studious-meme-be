import { model, Schema } from 'mongoose';
import { IProductQuestion } from './productQuestion.interface';

const productQuestionSchema = new Schema<IProductQuestion>(
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
      required: [true, 'User is required!'],
      index: true,
    },
    question: {
      type: String,
      required: [true, 'Question is required!'],
      trim: true,
      maxlength: 1000,
    },
    answer: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    answeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'answered', 'hidden'],
      default: 'pending',
      index: true,
    },
    answeredAt: {
      type: Date,
    },
  },
  { timestamps: true, versionKey: false },
);

productQuestionSchema.index(
  { product: 1, createdAt: -1 },
  { name: 'product_question_product_createdAt_idx' },
);
productQuestionSchema.index(
  { status: 1, createdAt: -1 },
  { name: 'product_question_status_createdAt_idx' },
);
productQuestionSchema.index(
  { user: 1, createdAt: -1 },
  { name: 'product_question_user_createdAt_idx' },
);

export const ProductQuestionModel = model<IProductQuestion>(
  'ProductQuestion',
  productQuestionSchema,
);
