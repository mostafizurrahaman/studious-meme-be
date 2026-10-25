import httpStatus from 'http-status';
import { AppError } from '../../utils';
import { BrandModel } from '../Brand/brand.model';
import { CategoryModel } from '../Category/category.model';
import { HeroBannerModel, HeroSectionModel } from './heroSection.model';
import { ProductModel } from '../Product/product.model';
import {
  IHeroBanner,
  IHeroSection,
  THeroBannerSlot,
} from './heroSection.interface';
import {
  deleteImageByUrl,
  R2_FOLDERS,
  sendImageToR2,
  uploadFilesAndInjectUrls,
} from '../../lib';
import { MulterFile } from '../../lib/upload';

// 1. syncLegacyHeroSectionIfNeeded (Auto Migration)
const syncLegacyHeroSectionIfNeeded = async () => {
  const count = await HeroBannerModel.countDocuments();
  if (count > 0) return;

  const legacySection = await HeroSectionModel.findOne({})
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  if (!legacySection) return;

  const docsToInsert: Partial<IHeroBanner>[] = [];

  (legacySection.slides || []).forEach((slide, index) => {
    if (slide.image) {
      docsToInsert.push({
        title: slide.title || 'Slide Banner',
        description: slide.description || '',
        image: slide.image,
        imageAlt: slide.imageAlt || slide.title || 'Slide',
        clickUrl: slide.clickUrl || '/shop',
        slot: 'SLIDE',
        order: index,
        isActive: legacySection.isActive ?? true,
      });
    }
  });

  (legacySection.features || []).forEach((feature, index) => {
    if (feature.image) {
      docsToInsert.push({
        title: feature.title || 'Feature Card',
        description: feature.description || '',
        image: feature.image,
        imageAlt: feature.imageAlt || feature.title || 'Feature',
        clickUrl: feature.clickUrl || '/shop',
        slot: 'FEATURE',
        order: index,
        isActive: legacySection.isActive ?? true,
      });
    }
  });

  if (docsToInsert.length > 0) {
    await HeroBannerModel.insertMany(docsToInsert);
  }
};

const getPositiveLimit = (value: unknown) => {
  const limit = Number(value);
  return Number.isInteger(limit) && limit > 0 ? limit : undefined;
};

const HOME_BRAND_FIELDS = 'name slug image';
const HOME_PRODUCT_FIELDS =
  'title slug sku images price oldPrice badge sellingUnit brand category stock rating isFeatured isNoCOD weightKg createdAt';
const HOME_PRODUCT_POPULATE = [
  { path: 'brand', select: 'name slug', match: { isActive: true } },
  { path: 'category', select: 'name slug', match: { isActive: true } },
];

// 2. getHomeContentFromDB (Storefront Aggregator)
const getHomeContentFromDB = async (query: Record<string, unknown> = {}) => {
  await syncLegacyHeroSectionIfNeeded();

  const brandLimit = getPositiveLimit(query.brandLimit);
  const categoryLimit = getPositiveLimit(query.categoryLimit);
  const activeProductFilter = {
    isActive: true,
  };

  const [activeBanners, brands, categories, featuredProducts, latestProducts] =
    await Promise.all([
      HeroBannerModel.find({ isActive: true })
        .sort({ order: 1, createdAt: -1 })
        .lean(),
      BrandModel.find({ isActive: true })
        .select(HOME_BRAND_FIELDS)
        .sort({ name: 1 })
        .limit(brandLimit ?? 0)
        .lean(),
      CategoryModel.aggregate([
        {
          $match: {
            isActive: true,
          },
        },
        {
          $project: {
            _id: '$_id',
            name: '$name',
            slug: '$slug',
            image: { $ifNull: ['$image', null] },
            description: { $ifNull: ['$description', null] },
            accent: {
              $ifNull: ['$accent', null],
            },
            metaTitle: { $ifNull: ['$metaTitle', null] },
            metaDescription: { $ifNull: ['$metaDescription', null] },
            imageAlt: { $ifNull: ['$imageAlt', null] },
            subCategories: {
              $map: {
                input: '$subCategories',
                as: 'subCategory',
                in: {
                  id: '$$subCategory._id',
                  name: '$$subCategory.name',
                  slug: '$$subCategory.slug',
                  metaTitle: '$$subCategory.metaTitle',
                  metaDescription: '$$subCategory.metaDescription',
                },
              },
            },
          },
        },
        {
          $sort: {
            name: -1,
          },
        },
        {
          $limit: categoryLimit || 10,
        },
      ]),
      ProductModel.find({ ...activeProductFilter, isFeatured: true })
        .select(HOME_PRODUCT_FIELDS)
        .populate(HOME_PRODUCT_POPULATE)
        .sort({ updatedAt: -1 })
        .limit(30)
        .lean()
        .then(docs =>
          docs.filter((p: any) => p.brand && p.category).slice(0, 10),
        ),
      ProductModel.find(activeProductFilter)
        .select(HOME_PRODUCT_FIELDS)
        .populate(HOME_PRODUCT_POPULATE)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
        .then(docs =>
          docs.filter((p: any) => p.brand && p.category).slice(0, 20),
        ),
    ]);

  const slides = activeBanners
    .filter(b => b.slot === 'SLIDE')
    .map(b => ({
      _id: b._id.toString(),
      image: b.image,
      imageAlt: b.imageAlt,
      title: b.title,
      description: b.description || '',
      clickUrl: b.clickUrl,
      slot: b.slot,
      order: b.order,
      isActive: b.isActive,
    }));

  const features = activeBanners
    .filter(b => b.slot === 'FEATURE')
    .map(b => ({
      _id: b._id.toString(),
      image: b.image,
      imageAlt: b.imageAlt,
      title: b.title,
      description: b.description || '',
      clickUrl: b.clickUrl,
      slot: b.slot,
      order: b.order,
      isActive: b.isActive,
    }));

  return {
    heroSection: {
      slides,
      features,
      isActive: true,
    },
    brands,
    categories,
    featuredProducts,
    latestProducts,
  };
};

// 3. createHeroBannerIntoDB
const createHeroBannerIntoDB = async (
  payload: Partial<IHeroBanner>,
  imageFile?: MulterFile,
) => {
  if (!imageFile && !payload.image) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Banner image is required!');
  }

  let imageUrl = payload.image;
  if (imageFile) {
    const { secure_url } = await sendImageToR2(
      imageFile,
      R2_FOLDERS.HERO_SECTION,
    );
    imageUrl = secure_url;
  }

  let order = payload.order;
  if (order === undefined || order === null) {
    const lastItem = await HeroBannerModel.findOne({ slot: payload.slot })
      .sort({ order: -1 })
      .select('order')
      .lean();
    order = (lastItem?.order ?? -1) + 1;
  }

  try {
    const banner = await HeroBannerModel.create({
      ...payload,
      image: imageUrl,
      order,
    });
    return banner;
  } catch (error) {
    if (imageFile && imageUrl) {
      await deleteImageByUrl(imageUrl);
    }
    throw error;
  }
};

// 4. getAllHeroBannersFromDB
const getAllHeroBannersFromDB = async (query: Record<string, unknown> = {}) => {
  await syncLegacyHeroSectionIfNeeded();

  const filter: Record<string, unknown> = {};

  if (query.slot && ['SLIDE', 'FEATURE'].includes(String(query.slot))) {
    filter.slot = query.slot;
  }

  if (query.isActive !== undefined && query.isActive !== '') {
    filter.isActive = String(query.isActive) === 'true';
  }

  const searchTerm =
    typeof query.searchTerm === 'string' ? query.searchTerm.trim() : '';
  if (searchTerm) {
    filter.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { clickUrl: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  return HeroBannerModel.find(filter)
    .sort({ slot: 1, order: 1, createdAt: -1 })
    .lean();
};

// 5. getHeroBannerByIdFromDB
const getHeroBannerByIdFromDB = async (id: string) => {
  const doc = await HeroBannerModel.findById(id).lean();
  if (!doc) throw new AppError(httpStatus.NOT_FOUND, 'Banner not found!');
  return doc;
};

// 6. updateHeroBannerIntoDB
const updateHeroBannerIntoDB = async (
  id: string,
  payload: Partial<IHeroBanner>,
  imageFile?: MulterFile,
) => {
  const existing = await HeroBannerModel.findById(id);
  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, 'Banner not found!');
  }

  let uploadedImage: string | undefined;

  try {
    if (imageFile) {
      const { secure_url } = await sendImageToR2(
        imageFile,
        R2_FOLDERS.HERO_SECTION,
      );
      uploadedImage = secure_url;
    }

    const updated = await HeroBannerModel.findByIdAndUpdate(
      id,
      {
        ...payload,
        ...(uploadedImage ? { image: uploadedImage } : {}),
      },
      { returnDocument: 'after', runValidators: true },
    );

    if (!updated) {
      if (uploadedImage) await deleteImageByUrl(uploadedImage);
      throw new AppError(httpStatus.NOT_FOUND, 'Banner not found!');
    }

    if (uploadedImage && existing.image && existing.image !== uploadedImage) {
      await deleteImageByUrl(existing.image);
    }

    return updated;
  } catch (error) {
    if (uploadedImage) {
      await deleteImageByUrl(uploadedImage);
    }
    throw error;
  }
};

// 7. updateHeroBannerStatusIntoDB
const updateHeroBannerStatusIntoDB = async (id: string, isActive: boolean) => {
  const updated = await HeroBannerModel.findByIdAndUpdate(
    id,
    { isActive },
    { returnDocument: 'after', runValidators: true },
  );

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, 'Banner not found!');
  }

  return updated;
};

// 8. reorderHeroBannersIntoDB
const reorderHeroBannersIntoDB = async (
  items: Array<{ id: string; order: number }>,
) => {
  const operations = items.map(item => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { order: item.order } },
    },
  }));

  if (operations.length > 0) {
    await HeroBannerModel.bulkWrite(operations);
  }

  return { updatedCount: items.length };
};

// 9. deleteHeroBannerFromDB
const deleteHeroBannerFromDB = async (id: string) => {
  const deleted = await HeroBannerModel.findByIdAndDelete(id);
  if (!deleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Banner not found!');
  }

  if (deleted.image) {
    await deleteImageByUrl(deleted.image);
  }

  return deleted;
};

// --- Legacy Handlers for Full Backward Compatibility ---
const getAllHeroSectionsFromDB = async () => {
  await syncLegacyHeroSectionIfNeeded();
  const allBanners = await HeroBannerModel.find({})
    .sort({ order: 1, createdAt: -1 })
    .lean();

  const slides = allBanners
    .filter(b => b.slot === 'SLIDE')
    .map(b => ({
      _id: b._id.toString(),
      image: b.image,
      imageAlt: b.imageAlt,
      title: b.title,
      description: b.description || '',
      clickUrl: b.clickUrl,
      slot: b.slot,
      order: b.order,
      isActive: b.isActive,
    }));

  const features = allBanners
    .filter(b => b.slot === 'FEATURE')
    .map(b => ({
      _id: b._id.toString(),
      image: b.image,
      imageAlt: b.imageAlt,
      title: b.title,
      description: b.description || '',
      clickUrl: b.clickUrl,
      slot: b.slot,
      order: b.order,
      isActive: b.isActive,
    }));

  return [
    {
      _id: 'singleton-hero-section',
      slides,
      features,
      isActive: true,
    },
  ];
};

const getHeroSectionByIdFromDB = async (_id: string) => {
  const sections = await getAllHeroSectionsFromDB();
  return sections[0];
};

const createHeroSectionIntoDB = async (
  payload: Partial<IHeroSection>,
  files?: MulterFile[] | unknown,
) => {
  const nextPayload = await uploadFilesAndInjectUrls(
    payload,
    Array.isArray(files) ? files : [],
    { folder: R2_FOLDERS.HERO_SECTION },
  );

  const docsToInsert: Partial<IHeroBanner>[] = [];

  (nextPayload.slides || []).forEach((slide, index) => {
    if (slide.image) {
      docsToInsert.push({
        title: slide.title,
        description: slide.description || '',
        image: slide.image,
        imageAlt: slide.imageAlt,
        clickUrl: slide.clickUrl,
        slot: 'SLIDE',
        order: index,
        isActive: nextPayload.isActive ?? true,
      });
    }
  });

  (nextPayload.features || []).forEach((feature, index) => {
    if (feature.image) {
      docsToInsert.push({
        title: feature.title,
        description: feature.description || '',
        image: feature.image,
        imageAlt: feature.imageAlt,
        clickUrl: feature.clickUrl,
        slot: 'FEATURE',
        order: index,
        isActive: nextPayload.isActive ?? true,
      });
    }
  });

  const oldBanners = await HeroBannerModel.find({});
  await HeroBannerModel.deleteMany({});
  await Promise.all(
    oldBanners.map(b => (b.image ? deleteImageByUrl(b.image) : null)),
  );

  if (docsToInsert.length > 0) {
    await HeroBannerModel.insertMany(docsToInsert);
  }

  const sections = await getAllHeroSectionsFromDB();
  return sections[0];
};

const updateHeroSectionIntoDB = async (
  _id: string,
  payload: Partial<IHeroSection>,
  files?: MulterFile[] | unknown,
) => {
  return createHeroSectionIntoDB(payload, files);
};

const deleteHeroSectionFromDB = async (_id: string) => {
  const oldBanners = await HeroBannerModel.find({});
  await HeroBannerModel.deleteMany({});
  await Promise.all(
    oldBanners.map(b => (b.image ? deleteImageByUrl(b.image) : null)),
  );
  return { deleted: true };
};

export const HeroSectionService = {
  // Storefront & Public
  getHomeContentFromDB,
  // Atomic Hero Banner APIs
  createHeroBannerIntoDB,
  getAllHeroBannersFromDB,
  getHeroBannerByIdFromDB,
  updateHeroBannerIntoDB,
  updateHeroBannerStatusIntoDB,
  reorderHeroBannersIntoDB,
  deleteHeroBannerFromDB,
  // Legacy APIs (for smooth compatibility)
  createHeroSectionIntoDB,
  getAllHeroSectionsFromDB,
  getHeroSectionByIdFromDB,
  updateHeroSectionIntoDB,
  deleteHeroSectionFromDB,
};
