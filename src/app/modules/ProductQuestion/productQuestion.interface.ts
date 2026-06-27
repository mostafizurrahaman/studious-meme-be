import { Types } from 'mongoose';

export type ProductQuestionStatus = 'pending' | 'answered' | 'hidden';

export interface IProductQuestion {
  product: Types.ObjectId;
  user: Types.ObjectId;
  question: string;
  answer?: string;
  answeredBy?: Types.ObjectId;
  status: ProductQuestionStatus;
  answeredAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
