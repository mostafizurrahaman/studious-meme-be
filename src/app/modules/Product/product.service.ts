import httpStatus from 'http-status';
import { AppError } from '../../utils';
import { deleteImageFromCloudinary, sendImageToCloudinary } from '../../lib';
import { ProductModel } from './product.model';
import { IProduct } from './product.interface';
import { CategoryModel } from '../Category/category.model';
import { MulterFile } from '../../lib/upload';
import { BrandModel } from '../Brand/brand.model';
import { DEFAULT_SELLING_UNIT, normalizeSellingUnit } from './selling-unit';

type ProductSort = Record<string, 1 | -1>;

const DEFAULT_PRODUCTS_LIMIT = 100;
const MAX_PRODUCT_IMAGES = 5;

const normalizeSlug = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/["'’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeYouTubeVideoUrl = (value: unknown) => {
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

const extractYouTubeVideoId = (value: string) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase();
    const pathname = url.pathname.replace(/\/+$/, '');

    if (hostname === 'youtu.be') {
      const id = pathname.split('/').filter(Boolean)[0] ?? '';
      return YOUTUBE_VIDEO_ID_PATTERN.test(id) ? id : undefined;
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (pathname === '/watch') {
        const id = url.searchParams.get('v') ?? '';
        return YOUTUBE_VIDEO_ID_PATTERN.test(id) ? id : undefined;
      }

      if (pathname.startsWith('/embed/')) {
        const id = pathname.split('/').filter(Boolean)[1] || '';
        return YOUTUBE_VIDEO_ID_PATTERN.test(id) ? id : undefined;
      }

      if (pathname.startsWith('/shorts/')) {
        const id = pathname.split('/').filter(Boolean)[1] || '';
        return YOUTUBE_VIDEO_ID_PATTERN.test(id) ? id : undefined;
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const parsePositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const csv = (value: unknown) =>
  getString(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const pickFields = (value: unknown) => {
  const fields = csv(value)
    .filter((field) => /^[a-zA-Z0-9_.-]+$/.test(field))
    .join(' ');

  return fields || undefined;
};

const pickSort = (value: unknown): ProductSort => {
  switch (getString(value)) {
    case 'price-asc':
      return { price: 1, createdAt: -1, _id: -1 };
    case 'price-desc':
      return { price: -1, createdAt: -1, _id: -1 };
    case 'oldest':
      return { createdAt: 1, _id: 1 };
    case 'latest':
    default:
      return { createdAt: -1, _id: -1 };
  }
};

const parseCustomPriceRange = (value: string) => {
  const match = value.match(/^(\d*)-(\d*)$/);
  if (!match) return null;

  const rawMin = match[1];
  const rawMax = match[2];

  if (!rawMin && !rawMax) return null;

  const parsedMin = rawMin ? Number(rawMin) : undefined;
  const parsedMax = rawMax ? Number(rawMax) : undefined;

  const min =
    typeof parsedMin === 'number' &&
    Number.isFinite(parsedMin) &&
    parsedMin >= 0
      ? parsedMin
      : undefined;
  const max =
    typeof parsedMax === 'number' &&
    Number.isFinite(parsedMax) &&
    parsedMax >= 0
      ? parsedMax
      : undefined;

  if (min === undefined && max === undefined) return null;

  if (min !== undefined && max !== undefined) {
    return min <= max ? { min, max } : { min: max, max: min };
  }

  return { min, max };
};

const buildProductFilters = async (query: Record<string, unknown>) => {
  const filter: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];
  const includeInactive = query.includeInactive === 'true';
  const searchTerm = getString(query.searchTerm);
  const categorySlug = getString(query.category || query.c);
  const subCategorySlug = getString(query.subCategorySlug || query.subCategory);
  const stock = getString(query.stock || query.s);
  const tag = getString(query.tag);
  const price = getString(query.price || query.p);
  const brandValues = csv(query.brand || query.b);
  const excludeSlug = getString(query.excludeSlug);

  filter.isActive = includeInactive ? undefined : true;
  if (filter.isActive === undefined) delete filter.isActive;

  if (searchTerm) {
    and.push({
      $or: ['title', 'sku', 'slug', 'badge', 'features', 'description'].map(
        (field) => ({
          [field]: { $regex: escapeRegExp(searchTerm), $options: 'i' },
        }),
      ),
    });
  }

  if (categorySlug) {
    const category = await CategoryModel.findOne({
      ...(includeInactive ? {} : { isActive: true }),
      $or: [
        { slug: categorySlug },
        { name: { $regex: `^${escapeRegExp(categorySlug)}$`, $options: 'i' } },
      ],
    })
      .select('_id')
      .lean();
    if (!category) {
      filter.category = null;
    } else {
      filter.category = category._id;
    }
  }

  if (subCategorySlug) {
    filter.subCategorySlug = subCategorySlug;
  }

  if (brandValues.length > 0) {
    const brands = await BrandModel.find({
      ...(includeInactive ? {} : { isActive: true }),
      $or: [
        { slug: { $in: brandValues } },
        { name: { $in: brandValues } },
        ...brandValues.map((value) => ({
          name: { $regex: `^${escapeRegExp(value)}$`, $options: 'i' },
        })),
      ],
    })
      .select('_id')
      .lean();

    filter.brand = brands.length
      ? { $in: brands.map((brand) => brand._id) }
      : null;
  }

  if (stock === 'in-stock') {
    and.push({
      $or: [
        { stock: { $gt: 0 } },
        { stock: { $exists: false } },
        { stock: null },
      ],
    });
  }

  if (price === 'under-10000') {
    filter.price = { $lt: 10000 };
  } else if (price === '10000-50000') {
    filter.price = { $gte: 10000, $lt: 50000 };
  } else if (price === '50000-plus') {
    filter.price = { $gte: 50000 };
  } else if (price) {
    const customRange = parseCustomPriceRange(price);

    if (customRange) {
      const rangeFilter: Record<string, number> = {};

      if (customRange.min !== undefined) {
        rangeFilter.$gte = customRange.min;
      }

      if (customRange.max !== undefined) {
        rangeFilter.$lte = customRange.max;
      }

      if (Object.keys(rangeFilter).length > 0) {
        filter.price = rangeFilter;
      }
    }
  }

  if (stock === 'featured' || tag === 'featured') {
    and.push({
      $or: [
        { isFeatured: true },
        { badge: { $regex: 'featured', $options: 'i' } },
      ],
    });
  }

  if (stock === 'sale' || tag === 'sale') {
    and.push({
      $or: [
        { oldPrice: { $exists: true, $ne: null } },
        { badge: { $regex: 'sale|%', $options: 'i' } },
      ],
    });
  }

  if (tag === 'latest') {
    and.push({
      $or: [{ badge: { $exists: false } }, { badge: { $not: /old/i } }],
    });
  }

  if (tag === 'industrial' || tag === 'home') {
    const pattern =
      tag === 'industrial'
        ? /tool|machine|industrial|welding|cutting/i
        : /home|fan|cleaning|cooler/i;
    if (!filter.category) {
      const categories = await CategoryModel.find({
        ...(includeInactive ? {} : { isActive: true }),
        name: pattern,
      })
        .select('_id')
        .lean();
      filter.category = { $in: categories.map((category) => category._id) };
    }
  }

  if (!includeInactive) {
    const referenceFilters: Promise<unknown>[] = [];

    if (!('category' in filter)) {
      referenceFilters.push(
        CategoryModel.find({ isActive: true })
          .distinct('_id')
          .then((categoryIds) => {
            filter.category = { $in: categoryIds };
          }),
      );
    }

    if (!('brand' in filter)) {
      referenceFilters.push(
        BrandModel.find({ isActive: true })
          .distinct('_id')
          .then((brandIds) => {
            filter.brand = { $in: brandIds };
          }),
      );
    }

    await Promise.all(referenceFilters);
  }

  if (and.length > 0) {
    filter.$and = and;
  }

  if (excludeSlug) {
    filter.slug = { $ne: excludeSlug };
  }

  return filter;
};

// 1. createProductIntoDB
const createProductIntoDB = async (
  payload: Partial<IProduct>,
  imageFiles?: MulterFile[] | { [fieldname: string]: MulterFile[] },
) => {
  const files = Array.isArray(imageFiles)
    ? imageFiles
    : Object.values(imageFiles ?? {}).flat();
  const uploadedImages: string[] = [];

  try {
    for (const imageFile of files) {
      const { secure_url } = await sendImageToCloudinary(imageFile);
      uploadedImages.push(secure_url);
    }

    const images =
      uploadedImages.length > 0
        ? uploadedImages
        : Array.isArray(payload.images) && payload.images.length > 0
          ? payload.images
          : [];

    if (images.length === 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'At least one product image is required!',
      );
    }
    if (images.length > MAX_PRODUCT_IMAGES) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `You can upload up to ${MAX_PRODUCT_IMAGES} product images!`,
      );
    }

    const youtubeVideoUrl = normalizeYouTubeVideoUrl(payload.youtubeVideoUrl);
    const youtubeVideoId = youtubeVideoUrl
      ? extractYouTubeVideoId(youtubeVideoUrl)
      : undefined;
    const sellingUnit =
      normalizeSellingUnit(payload.sellingUnit) ?? DEFAULT_SELLING_UNIT;
    const createPayload: Record<string, unknown> = { ...payload, sellingUnit };

    return ProductModel.create({
      ...createPayload,
      slug: normalizeSlug(String(payload.slug ?? payload.title ?? '')),
      images,
      sellingUnit,
      ...(youtubeVideoUrl ? { youtubeVideoUrl, youtubeVideoId } : {}),
    });
  } catch (error) {
    await Promise.all(
      uploadedImages.map((url) => deleteImageFromCloudinary(url)),
    );

    throw error;
  }
};

// 2. getAllProductsFromDB
const getAllProductsFromDB = async (query: Record<string, unknown>) => {
  const page = parsePositiveInteger(query.page, 1);
  const limit = parsePositiveInteger(query.limit, DEFAULT_PRODUCTS_LIMIT);
  const skip = (page - 1) * limit;
  const filter = await buildProductFilters(query);
  const sort = pickSort(query.sort);
  const fields = pickFields(query.fields);

  let productsQuery = ProductModel.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  if (fields) {
    productsQuery = productsQuery.select(fields);
  } else {
    productsQuery = productsQuery
      .populate('brand')
      .populate('category');
  }

  const [data, total] = await Promise.all([
    productsQuery.lean(),
    ProductModel.countDocuments(filter),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

// 3. getAllActiveProductsFromDB
const getAllActiveProductsFromDB = async (query: Record<string, unknown>) =>
  getAllProductsFromDB({ ...query, includeInactive: undefined });

// 4. getProductBySlugFromDB
const getProductBySlugFromDB = async (slug: string) => {
  const doc = await ProductModel.findOne({ slug })
    .populate('brand')
    .populate('category')
    .lean();
  if (!doc) throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
  return doc;
};

// 5. getActiveProductBySlugFromDB
const getActiveProductBySlugFromDB = async (slug: string) => {
  const doc = await ProductModel.findOne({ slug, isActive: true })
    .populate({ path: 'brand', match: { isActive: true } })
    .populate({ path: 'category', match: { isActive: true } })
    .lean();

  if (!doc || !doc.brand || !doc.category)
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');

  return doc;
};

// 4. updateProductIntoDB
const updateProductIntoDB = async (
  slug: string,
  payload: Partial<IProduct>,
  imageFiles?: MulterFile[] | { [fieldname: string]: MulterFile[] },
) => {
  const existingProduct = await ProductModel.findOne({ slug }).select('images');

  if (!existingProduct) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
  }

  const files = Array.isArray(imageFiles)
    ? imageFiles
    : Object.values(imageFiles ?? {}).flat();
  const uploadedImages: string[] = [];

  try {
    for (const imageFile of files) {
      const { secure_url } = await sendImageToCloudinary(imageFile);
      uploadedImages.push(secure_url);
    }

    const existingImages = existingProduct.images;
    const retainedImages = Array.isArray(payload.images)
      ? payload.images
      : existingImages;
    const nextImages = Array.from(
      new Set(
        uploadedImages.length > 0
          ? [...retainedImages, ...uploadedImages]
          : retainedImages,
      ),
    );
    const shouldUpdateYoutubeVideoUrl = Object.prototype.hasOwnProperty.call(
      payload,
      'youtubeVideoUrl',
    );
    const shouldUpdateSellingUnit = Object.prototype.hasOwnProperty.call(
      payload,
      'sellingUnit',
    );
    const youtubeVideoUrl = shouldUpdateYoutubeVideoUrl
      ? normalizeYouTubeVideoUrl(payload.youtubeVideoUrl)
      : undefined;
    const youtubeVideoId = youtubeVideoUrl
      ? extractYouTubeVideoId(youtubeVideoUrl)
      : undefined;

    if (nextImages.length === 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'At least one product image is required!',
      );
    }
    if (nextImages.length > MAX_PRODUCT_IMAGES) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `You can upload up to ${MAX_PRODUCT_IMAGES} product images!`,
      );
    }

    const updateSet: Record<string, unknown> = {
      ...payload,
      slug: payload.slug ? normalizeSlug(String(payload.slug)) : payload.slug,
      images: nextImages,
    };

    if (shouldUpdateSellingUnit) {
      updateSet.sellingUnit =
        normalizeSellingUnit(payload.sellingUnit) ?? DEFAULT_SELLING_UNIT;
    }

    const updateQuery: Record<string, unknown> = { $set: updateSet };

    if (shouldUpdateYoutubeVideoUrl) {
      if (youtubeVideoUrl) {
        updateSet.youtubeVideoUrl = youtubeVideoUrl;
        updateSet.youtubeVideoId = youtubeVideoId;
      } else {
        delete updateSet.youtubeVideoUrl;
        delete updateSet.youtubeVideoId;
        updateQuery.$unset = { youtubeVideoUrl: '', youtubeVideoId: '' };
      }
    }

    const updated = await ProductModel.findOneAndUpdate({ slug }, updateQuery, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!updated) {
      await Promise.all(
        uploadedImages.map((url) => deleteImageFromCloudinary(url)),
      );
      throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
    }

    if (uploadedImages.length > 0) {
      await Promise.all(
        existingImages
          .filter((url) => !nextImages.includes(url))
          .map((url) => deleteImageFromCloudinary(url)),
      );
    }

    return updated;
  } catch (error) {
    await Promise.all(
      uploadedImages.map((url) => deleteImageFromCloudinary(url)),
    );

    throw error;
  }
};

// 5. deleteProductFromDB
const deleteProductFromDB = async (slug: string) => {
  const product = await ProductModel.findOneAndDelete({ slug });
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
  }
  return product;
};

// 6. getProductsByCategorySlugFromDB
const getProductsByCategorySlugFromDB = async (
  slug: string,
  query: Record<string, unknown> = {},
) => {
  const category = await CategoryModel.findOne({ slug, isActive: true }).lean();
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
  }
  return getAllProductsFromDB({ ...query, c: slug });
};

// 7. getProductsBySubCategorySlugFromDB
const getProductsBySubCategorySlugFromDB = async (
  subCategorySlug: string,
  query: Record<string, unknown> = {},
) => {
  const category = await CategoryModel.findOne({
    isActive: true,
    subCategories: {
      $elemMatch: {
        slug: subCategorySlug,
        isActive: { $ne: false },
      },
    },
  }).lean();

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'SubCategory not found!');
  }

  return getAllProductsFromDB({ ...query, subCategorySlug });
};

// 8. searchProducts
const searchProducts = async (searchTerm: string, limit = 10) => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return { products: [], suggestions: [] };
  }

  const term = searchTerm.trim().toLowerCase();
  const regex = new RegExp(term, 'i');

  // Search across multiple fields
  const products = await ProductModel.aggregate([
    {
      $match: {
        isActive: true,
        $or: [
          { title: regex },
          { slug: regex },
          { sku: regex },
          { features: regex },
          { description: regex },
          { badge: regex },
        ],
      },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        title: 1,
        slug: 1,
        price: 1,
        oldPrice: 1,
        images: 1,
        badge: 1,
        sellingUnit: 1,
        _id: 0,
      },
    },
  ]);

  // Get unique title suggestions using aggregation
  const suggestions = await ProductModel.aggregate([
    {
      $match: {
        isActive: true,
        $or: [{ title: regex }, { slug: regex }, { sku: regex }],
      },
    },
    {
      $group: {
        _id: '$title',
        slug: { $first: '$slug' },
      },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        _id: 0,
        title: '$_id',
        slug: 1,
      },
    },
  ]);

  return { products, suggestions };
};

// // 7. getProductsBySubCategorySlugFromDB
// const getProductsBySubCategorySlugFromDB = async (subCategorySlug: string) => {
//     // find category that contains this subcategory
//     const category = await CategoryModel.findOne({
//         'subCategories.slug': subCategorySlug,
//         isActive: true,
//     }).lean();

//     if (!category) {
//         throw new AppError(httpStatus.NOT_FOUND, 'SubCategory not found!');
//     }

//     // find the exact subcategory object
//     const subCategory = category.subCategories.find(sc => sc.slug === subCategorySlug && sc.isActive);

//     if (!subCategory) {
//         throw new AppError(httpStatus.NOT_FOUND, 'SubCategory not active!');
//     }

//     // now query products using slug (NOT _id)
//     return ProductModel.find({ subCategorySlug, isActive: true })
//         .populate('brand')
//         .populate('category')
//         .lean();
// };

export const ProductService = {
  createProductIntoDB,
  getAllProductsFromDB,
  getAllActiveProductsFromDB,
  getProductBySlugFromDB,
  getActiveProductBySlugFromDB,
  updateProductIntoDB,
  deleteProductFromDB,
  getProductsByCategorySlugFromDB,
  getProductsBySubCategorySlugFromDB,
  searchProducts,
};
