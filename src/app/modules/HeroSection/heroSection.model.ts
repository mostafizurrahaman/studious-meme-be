import { model, Schema } from 'mongoose';
import {
  IHeroBanner,
  IHeroCard,
  IHeroSection,
} from './heroSection.interface';

const heroBannerSchema = new Schema<IHeroBanner>(
  {
    title: { type: String, required: [true, 'Title is required!'], trim: true },
    description: { type: String, default: '', trim: true },
    image: { type: String, required: [true, 'Image is required!'] },
    imageAlt: {
      type: String,
      required: [true, 'Image alt is required!'],
      trim: true,
    },
    clickUrl: {
      type: String,
      required: [true, 'Click URL is required!'],
      trim: true,
    },
    slot: {
      type: String,
      enum: ['SLIDE', 'FEATURE'],
      required: [true, 'Slot is required!'],
      index: true,
    },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

export const HeroBannerModel = model<IHeroBanner>(
  'HeroBanner',
  heroBannerSchema,
);

// Legacy schema kept for migration / fallback
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
