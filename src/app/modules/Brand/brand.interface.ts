export interface IBrand {
  name: string;
  slug: string;
  image?: string;
  imageAlt?: string;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
