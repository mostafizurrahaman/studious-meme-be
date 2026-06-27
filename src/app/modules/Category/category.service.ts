import httpStatus from 'http-status';
import { AppError } from '../../utils';
import { deleteImageFromCloudinary, sendImageToCloudinary } from '../../lib';
import { CategoryModel } from './category.model';
import { ICategory, ISubCategoryItem } from './category.interface';
import { MulterFile } from '../../lib/upload';

// 1. createCategoryIntoDB
const createCategoryIntoDB = async (
  payload: Partial<ICategory>,
  imageFile?: MulterFile,
) => {
  if (!imageFile) {
    throw new AppError(httpStatus.NOT_FOUND, 'Category image is required!');
  }

  const { secure_url } = await sendImageToCloudinary(imageFile);

  const category = await CategoryModel.create({
    ...payload,
    image: secure_url,
  });

  if (!category) {
    await deleteImageFromCloudinary(secure_url);
  }

  return category;
};

// 2. getAllCategoriesFromDB
const getAllCategoriesFromDB = async () =>
  CategoryModel.find({}).sort({ name: 1 }).lean();

// 3. getActiveCategoriesFromDB
const getActiveCategoriesFromDB = async () =>
  CategoryModel.find({ isActive: true })
    .sort({ name: 1 })
    .lean()
    .then((categories) =>
      categories.map((category) => ({
        ...category,
        subCategories:
          category.subCategories?.filter((item) => item.isActive !== false) ??
          [],
      })),
    );

// 3. getCategoryBySlugFromDB
const getCategoryBySlugFromDB = async (slug: string) => {
  const doc = await CategoryModel.findOne({ slug }).lean();
  if (!doc) throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
  return doc;
};

// 4. getActiveCategoryBySlugFromDB
const getActiveCategoryBySlugFromDB = async (slug: string) => {
  const doc = await CategoryModel.findOne({ slug, isActive: true }).lean();
  if (!doc) throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');

  return {
    ...doc,
    subCategories:
      doc.subCategories?.filter((item) => item.isActive !== false) ?? [],
  };
};

// 4. updateCategoryIntoDB
const updateCategoryIntoDB = async (
  slug: string,
  payload: Partial<ICategory>,
  imageFile?: MulterFile,
) => {
  const existingCategory = await CategoryModel.findOne({ slug }).select(
    'image',
  );

  if (!existingCategory) {
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
  }

  let uploadedImage: string | undefined;

  try {
    if (imageFile) {
      const { secure_url } = await sendImageToCloudinary(imageFile);
      uploadedImage = secure_url;
    }

    const updated = await CategoryModel.findOneAndUpdate(
      { slug },
      { ...payload, ...(uploadedImage ? { image: uploadedImage } : {}) },
      { returnDocument: 'after', runValidators: true },
    );

    if (!updated) {
      if (uploadedImage) {
        await deleteImageFromCloudinary(uploadedImage);
      }
      throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
    }

    if (
      uploadedImage &&
      existingCategory.image &&
      existingCategory.image !== uploadedImage
    ) {
      await deleteImageFromCloudinary(existingCategory.image);
    }

    return updated;
  } catch (error) {
    if (uploadedImage) {
      await deleteImageFromCloudinary(uploadedImage);
    }

    throw error;
  }
};

// 5. deleteCategoryFromDB
const deleteCategoryFromDB = async (slug: string) =>
  CategoryModel.findOneAndDelete({ slug });

// 6. createCategorySubCategoryIntoDB
const createCategorySubCategoryIntoDB = async (
  categorySlug: string,
  subCategory: ISubCategoryItem,
  imageFile?: MulterFile,
) => {
  const category = await CategoryModel.findOne({ slug: categorySlug });
  if (!category)
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');

  let uploadedImage: string | undefined;

  try {
    if (imageFile) {
      const { secure_url } = await sendImageToCloudinary(imageFile);
      uploadedImage = secure_url;
    }

    category.subCategories.push({
      ...subCategory,
      image: uploadedImage ?? subCategory.image,
    });
    return category.save();
  } catch (error) {
    if (uploadedImage) {
      await deleteImageFromCloudinary(uploadedImage);
    }

    throw error;
  }
};

// 7. updateCategorySubCategoryIntoDB
const updateCategorySubCategoryIntoDB = async (
  categorySlug: string,
  subCategorySlug: string,
  payload: Partial<ISubCategoryItem>,
  imageFile?: MulterFile,
) => {
  const category = await CategoryModel.findOne({ slug: categorySlug });
  if (!category)
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
  const item = category.subCategories.find(
    (item) => item.slug === subCategorySlug,
  );
  if (!item) throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found!');

  const previousImage = item.image;
  let uploadedImage: string | undefined;

  try {
    if (imageFile) {
      const { secure_url } = await sendImageToCloudinary(imageFile);
      uploadedImage = secure_url;
    }

    Object.assign(item, payload, uploadedImage ? { image: uploadedImage } : {});
    const saved = await category.save();

    if (uploadedImage && previousImage && previousImage !== uploadedImage) {
      await deleteImageFromCloudinary(previousImage);
    }

    return saved;
  } catch (error) {
    if (uploadedImage) {
      await deleteImageFromCloudinary(uploadedImage);
    }

    throw error;
  }
};

// 8. deleteCategorySubCategoryFromDB
const deleteCategorySubCategoryFromDB = async (
  categorySlug: string,
  subCategorySlug: string,
) => {
  const category = await CategoryModel.findOne({ slug: categorySlug });
  if (!category)
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
  const next = category.subCategories.filter(
    (item) => item.slug !== subCategorySlug,
  );
  if (next.length === category.subCategories.length)
    throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found!');
  category.subCategories = next;
  return category.save();
};

export const CategoryService = {
  createCategoryIntoDB,
  getAllCategoriesFromDB,
  getActiveCategoriesFromDB,
  getCategoryBySlugFromDB,
  getActiveCategoryBySlugFromDB,
  updateCategoryIntoDB,
  deleteCategoryFromDB,
  createCategorySubCategoryIntoDB,
  updateCategorySubCategoryIntoDB,
  deleteCategorySubCategoryFromDB,
};
