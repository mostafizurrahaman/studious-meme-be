import { TPageSlugs } from './page.constant';
import { Document } from 'mongoose';

export interface IPage extends Document {
  slug: TPageSlugs;
  title: string;
  content: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface IPagePayload {
  slug: TPageSlugs;
  title: string;
  content: string;
}
