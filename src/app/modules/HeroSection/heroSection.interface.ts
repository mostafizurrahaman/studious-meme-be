export type THeroBannerSlot = 'SLIDE' | 'FEATURE';

export interface IHeroBanner {
  _id?: string;
  title: string;
  description?: string;
  image: string;
  imageAlt: string;
  clickUrl: string;
  slot: THeroBannerSlot;
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IHeroCard {
  _id?: string;
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  clickUrl: string;
  slot?: THeroBannerSlot;
  order?: number;
  isActive?: boolean;
}

export interface IHeroSection {
  slides: IHeroCard[];
  features: IHeroCard[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
