import { model, Schema } from 'mongoose';
import { IHeroCard, IHeroSection } from './heroSection.interface';

const heroCardSchema = new Schema<IHeroCard>(
  {
    image: { type: String, required: [true, 'Image is required!'] },
    imageAlt: { type: String, required: [true, 'Image alt is required!'] },
    title: { type: String, required: [true, 'Title is required!'] },
    description: { type: String, required: [true, 'Description is required!'] },
    clickUrl: {
      type: String,
      required: [true, 'Click URL is required!'],
      index: true,
    },
  },
  { _id: false },
);

const heroSectionSchema = new Schema<IHeroSection>(
  {
    slides: { type: [heroCardSchema], default: [] },
    features: { type: [heroCardSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

export const HeroSectionModel = model<IHeroSection>(
  'HeroSection',
  heroSectionSchema,
);
