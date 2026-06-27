export interface ISubCategoryItem {
  name: string;
  slug: string;
  image?: string;
  description?: string;
  accent?: string;
  isActive: boolean;
}

export interface ICategory {
  name: string;
  slug: string;
  subCategories: ISubCategoryItem[];
  image?: string;
  description?: string;
  accent?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
