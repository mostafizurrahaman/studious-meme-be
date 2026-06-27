/* eslint-disable no-console */
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import mongoose from 'mongoose';
import config from '../config';
import { BrandModel } from '../modules/Brand/brand.model';
import { CategoryModel } from '../modules/Category/category.model';
import { ProductModel } from '../modules/Product/product.model';

const OLD_IMAGE_MARKERS = [
  'malamal.com.bd/wp-content/uploads',
  'i0.wp.com/malamal.com.bd/wp-content/uploads',
] as const;

const MIGRATION_FOLDERS = {
  products: 'malamal/products',
  brands: 'malamal/brands',
  categories: 'malamal/categories',
} as const;

cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

type MigrationStats = {
  checkedProducts: number;
  checkedBrands: number;
  checkedCategories: number;
  oldProductImagesFound: number;
  oldBrandImagesFound: number;
  oldCategoryImagesFound: number;
  imagesUploaded: number;
  reusedFromCache: number;
  updatedProductDocuments: number;
  updatedBrandDocuments: number;
  updatedCategoryDocuments: number;
  skippedBecauseNoImage: number;
  failedUploads: number;
};

const stats: MigrationStats = {
  checkedProducts: 0,
  checkedBrands: 0,
  checkedCategories: 0,
  oldProductImagesFound: 0,
  oldBrandImagesFound: 0,
  oldCategoryImagesFound: 0,
  imagesUploaded: 0,
  reusedFromCache: 0,
  updatedProductDocuments: 0,
  updatedBrandDocuments: 0,
  updatedCategoryDocuments: 0,
  skippedBecauseNoImage: 0,
  failedUploads: 0,
};

const uploadedUrlCache = new Map<string, string>();

const resetStats = () => {
  stats.checkedProducts = 0;
  stats.checkedBrands = 0;
  stats.checkedCategories = 0;
  stats.oldProductImagesFound = 0;
  stats.oldBrandImagesFound = 0;
  stats.oldCategoryImagesFound = 0;
  stats.imagesUploaded = 0;
  stats.reusedFromCache = 0;
  stats.updatedProductDocuments = 0;
  stats.updatedBrandDocuments = 0;
  stats.updatedCategoryDocuments = 0;
  stats.skippedBecauseNoImage = 0;
  stats.failedUploads = 0;
};

const delay = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isCloudinaryUrl = (url: string) =>
  /^https?:\/\/res\.cloudinary\.com\//i.test(url);

const isOldWordPressImageUrl = (url: string) =>
  !isCloudinaryUrl(url) &&
  OLD_IMAGE_MARKERS.some((marker) => url.includes(marker));

const waitForMongoConnection = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      mongoose.connection.off('connected', onConnected);
      mongoose.connection.off('error', onError);
    };

    const onConnected = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    mongoose.connection.once('connected', onConnected);
    mongoose.connection.once('error', onError);
  });
};

const uploadWithRetry = async (
  oldUrl: string,
  folder: string,
): Promise<string | null> => {
  const cachedUrl = uploadedUrlCache.get(oldUrl);

  if (cachedUrl) {
    stats.reusedFromCache += 1;
    return cachedUrl;
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = (await cloudinary.uploader.upload(oldUrl, {
        folder,
      })) as UploadApiResponse;

      if (!result?.secure_url) {
        throw new Error('Cloudinary did not return secure_url');
      }

      uploadedUrlCache.set(oldUrl, result.secure_url);
      stats.imagesUploaded += 1;
      return result.secure_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (attempt === 3) {
        stats.failedUploads += 1;
        console.error(`Failed image URL: ${oldUrl}`);
        console.error(`Error: ${message}`);
        return null;
      }

      await delay(500 * attempt);
    }
  }

  return null;
};

const findRemainingOldUrls = async () => {
  const remaining = new Set<string>();

  const collect = (value: unknown) => {
    if (typeof value !== 'string') {
      return;
    }

    if (isOldWordPressImageUrl(value)) {
      remaining.add(value);
    }
  };

  const products = await ProductModel.find({}, { images: 1 }).lean();
  products.forEach((product) => {
    product.images?.forEach(collect);
  });

  const brands = await BrandModel.find({}, { image: 1 }).lean();
  brands.forEach((brand) => collect(brand.image));

  const categories = await CategoryModel.find(
    {},
    { image: 1, subCategories: 1 },
  ).lean();
  categories.forEach((category) => {
    collect(category.image);
    category.subCategories?.forEach((subCategory) =>
      collect(subCategory.image),
    );
  });

  return Array.from(remaining);
};

const migrateProducts = async () => {
  const products = await ProductModel.find(
    {},
    { title: 1, slug: 1, images: 1 },
  );
  stats.checkedProducts = products.length;

  for (const product of products) {
    const images = Array.isArray(product.images) ? product.images : [];

    if (!images.length) {
      stats.skippedBecauseNoImage += 1;
      continue;
    }

    let changed = false;
    const nextImages: string[] = [];

    for (const imageUrl of images) {
      if (!isOldWordPressImageUrl(imageUrl)) {
        nextImages.push(imageUrl);
        continue;
      }

      stats.oldProductImagesFound += 1;
      const uploadedUrl = await uploadWithRetry(
        imageUrl,
        MIGRATION_FOLDERS.products,
      );

      if (!uploadedUrl) {
        nextImages.push(imageUrl);
        continue;
      }

      nextImages.push(uploadedUrl);
      changed = true;
    }

    if (!changed) {
      continue;
    }

    product.images = nextImages;
    product.markModified('images');
    await product.save();
    stats.updatedProductDocuments += 1;
    console.log(
      `Product updated: ${product.title} | ${product.slug} | ${product._id}`,
    );
  }
};

const migrateBrands = async () => {
  const brands = await BrandModel.find({}, { name: 1, slug: 1, image: 1 });
  stats.checkedBrands = brands.length;

  for (const brand of brands) {
    if (!brand.image) {
      stats.skippedBecauseNoImage += 1;
      continue;
    }

    if (!isOldWordPressImageUrl(brand.image)) {
      continue;
    }

    stats.oldBrandImagesFound += 1;
    const uploadedUrl = await uploadWithRetry(
      brand.image,
      MIGRATION_FOLDERS.brands,
    );

    if (!uploadedUrl) {
      continue;
    }

    brand.image = uploadedUrl;
    await brand.save();
    stats.updatedBrandDocuments += 1;
    console.log(`Brand updated: ${brand.name} | ${brand.slug} | ${brand._id}`);
  }
};

const migrateCategories = async () => {
  const categories = await CategoryModel.find(
    {},
    { name: 1, slug: 1, image: 1, subCategories: 1 },
  );
  stats.checkedCategories = categories.length;

  for (const category of categories) {
    let changed = false;

    if (category.image && isOldWordPressImageUrl(category.image)) {
      stats.oldCategoryImagesFound += 1;
      const uploadedUrl = await uploadWithRetry(
        category.image,
        MIGRATION_FOLDERS.categories,
      );

      if (uploadedUrl) {
        category.image = uploadedUrl;
        changed = true;
      }
    }

    const subCategories = Array.isArray(category.subCategories)
      ? category.subCategories
      : [];

    const hasAnyImage =
      Boolean(category.image) ||
      subCategories.some((item) => Boolean(item.image));

    if (!hasAnyImage) {
      stats.skippedBecauseNoImage += 1;
      continue;
    }

    for (const subCategory of subCategories) {
      if (!subCategory.image) {
        continue;
      }

      if (!isOldWordPressImageUrl(subCategory.image)) {
        continue;
      }

      stats.oldCategoryImagesFound += 1;
      const uploadedUrl = await uploadWithRetry(
        subCategory.image,
        MIGRATION_FOLDERS.categories,
      );

      if (!uploadedUrl) {
        continue;
      }

      subCategory.image = uploadedUrl;
      changed = true;
      console.log(
        `Subcategory image updated: ${category.name} | ${subCategory.slug} | ${subCategory.name}`,
      );
    }

    if (!changed) {
      continue;
    }

    category.markModified('subCategories');
    if (category.image) {
      category.markModified('image');
    }
    await category.save();
    stats.updatedCategoryDocuments += 1;
    console.log(
      `Category updated: ${category.name} | ${category.slug} | ${category._id}`,
    );
  }
};

export const migrateOldImagesToCloudinary = async (): Promise<void> => {
  console.log('Migration started');
  resetStats();

  try {
    await waitForMongoConnection();

    await migrateProducts();
    await migrateBrands();
    await migrateCategories();

    const remainingOldUrls = await findRemainingOldUrls();

    console.log(`Total products checked: ${stats.checkedProducts}`);
    console.log(`Total brands checked: ${stats.checkedBrands}`);
    console.log(`Total categories checked: ${stats.checkedCategories}`);
    console.log(
      `Total old product images found: ${stats.oldProductImagesFound}`,
    );
    console.log(`Total old brand images found: ${stats.oldBrandImagesFound}`);
    console.log(
      `Total old category images found: ${stats.oldCategoryImagesFound}`,
    );
    console.log(`Total images uploaded to Cloudinary: ${stats.imagesUploaded}`);
    console.log(`Total reused from cache: ${stats.reusedFromCache}`);
    console.log(
      `Total product documents updated: ${stats.updatedProductDocuments}`,
    );
    console.log(
      `Total brand documents updated: ${stats.updatedBrandDocuments}`,
    );
    console.log(
      `Total category documents updated: ${stats.updatedCategoryDocuments}`,
    );
    console.log(
      `Total skipped because no image/images: ${stats.skippedBecauseNoImage}`,
    );
    console.log(`Total failed uploads: ${stats.failedUploads}`);
    console.log(
      `Remaining old URLs after migration: ${remainingOldUrls.length}${remainingOldUrls.length ? ` | ${remainingOldUrls.join(', ')}` : ''}`,
    );
    console.log('Migration completed');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Migration failed: ${message}`);
  }
};
