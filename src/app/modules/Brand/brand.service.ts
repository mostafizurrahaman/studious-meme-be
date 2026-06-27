import httpStatus from 'http-status';
import { AppError } from '../../utils';
import { deleteImageFromCloudinary, sendImageToCloudinary } from '../../lib';
import { BrandModel } from './brand.model';
import { IBrand } from './brand.interface';
import { MulterFile } from '../../lib/upload';

// 1. createBrandIntoDB
const createBrandIntoDB = async (
  payload: Partial<IBrand>,
  imageFile?: MulterFile,
) => {
  if (!imageFile) {
    throw new AppError(httpStatus.NOT_FOUND, 'Brand image is required!');
  }

  const { secure_url } = await sendImageToCloudinary(imageFile);

  const brand = await BrandModel.create({
    ...payload,
    image: secure_url,
  });

  if (!brand) {
    await deleteImageFromCloudinary(secure_url);
  }

  return brand;
};

// 2. getAllBrandsFromDB
const getAllBrandsFromDB = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 50;
  const skip = (page - 1) * limit;
  const searchTerm =
    typeof query.searchTerm === 'string' ? query.searchTerm.trim() : '';
  const filter: Record<string, unknown> = {};

  if (searchTerm) {
    filter.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { slug: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    BrandModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    BrandModel.countDocuments(filter),
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

// 3. getActiveBrandsFromDB
const getActiveBrandsFromDB = async () =>
  BrandModel.find({ isActive: true }).sort({ name: 1 }).lean();

// 3. getBrandBySlugFromDB
const getBrandBySlugFromDB = async (slug: string) => {
  const doc = await BrandModel.findOne({ slug }).lean();
  if (!doc) throw new AppError(httpStatus.NOT_FOUND, 'Brand not found!');
  return doc;
};

// 4. getActiveBrandBySlugFromDB
const getActiveBrandBySlugFromDB = async (slug: string) => {
  const doc = await BrandModel.findOne({ slug, isActive: true }).lean();
  if (!doc) throw new AppError(httpStatus.NOT_FOUND, 'Brand not found!');
  return doc;
};

// 4. updateBrandIntoDB
const updateBrandIntoDB = async (
  slug: string,
  payload: Partial<IBrand>,
  imageFile?: MulterFile,
) => {
  const existingBrand = await BrandModel.findOne({ slug }).select('image');

  if (!existingBrand) {
    throw new AppError(httpStatus.NOT_FOUND, 'Brand not found!');
  }

  let uploadedImage: string | undefined;

  try {
    if (imageFile) {
      const { secure_url } = await sendImageToCloudinary(imageFile);
      uploadedImage = secure_url;
    }

    const updated = await BrandModel.findOneAndUpdate(
      { slug },
      { ...payload, ...(uploadedImage ? { image: uploadedImage } : {}) },
      { returnDocument: 'after', runValidators: true },
    );

    if (!updated) {
      if (uploadedImage) {
        await deleteImageFromCloudinary(uploadedImage);
      }
      throw new AppError(httpStatus.NOT_FOUND, 'Brand not found!');
    }

    if (
      uploadedImage &&
      existingBrand.image &&
      existingBrand.image !== uploadedImage
    ) {
      await deleteImageFromCloudinary(existingBrand.image);
    }

    return updated;
  } catch (error) {
    if (uploadedImage) {
      await deleteImageFromCloudinary(uploadedImage);
    }

    throw error;
  }
};

// 5. deleteBrandFromDB
const deleteBrandFromDB = async (slug: string) =>
  BrandModel.findOneAndDelete({ slug });

export const BrandService = {
  createBrandIntoDB,
  getAllBrandsFromDB,
  getActiveBrandsFromDB,
  getBrandBySlugFromDB,
  getActiveBrandBySlugFromDB,
  updateBrandIntoDB,
  deleteBrandFromDB,
};
