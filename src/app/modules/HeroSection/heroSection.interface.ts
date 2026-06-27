export interface IHeroCard {
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  clickUrl: string;
}

export interface IHeroSection {
  slides: IHeroCard[];
  features: IHeroCard[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
