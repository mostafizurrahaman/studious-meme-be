import { Types } from 'mongoose';

export interface IContact {
  _id: Types.ObjectId;

  name: string;
  company?: string;
  email: string;
  phone: string;

  subject: string;
  products: string;
  brand?: string;
  message: string;

  isReplied: boolean;

  createdAt: Date;
  updatedAt: Date;
}
