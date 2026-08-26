import httpStatus from 'http-status';
import { AppError } from '../../utils';
import { deleteImageFromCloudinary, sendImageToCloudinary } from '../../lib';
import { CategoryModel } from './category.model';
import { ICategory, ISubCategoryItem } from './category.interface';
import { MulterFile } from '../../lib/upload';

import { TGetAllSubCategoriesQueryType } from './category.validation';
import mongoose, { PipelineStage, Types } from 'mongoose';
import { ProductModel } from '../Product/product.model';

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

// 3. getActiveCategoriesFromDB`
const getActiveCategoriesFromDB = async () =>
  CategoryModel.find({ isActive: true })
    .sort({ name: 1 })
    .lean()
    .then(categories =>
      categories.map(category => ({
        ...category,
        subCategories:
          category.subCategories?.filter(item => item.isActive !== false) ?? [],
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
      doc.subCategories?.filter(item => item.isActive !== false) ?? [],
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
const deleteCategoryFromDB = async (slug: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const deletedCategory = await CategoryModel.findOneAndDelete(
      { slug },
      { session },
    );

    if (!deletedCategory) {
      throw new AppError(httpStatus.NOT_FOUND, 'Category not found.');
    }

    await ProductModel.deleteMany(
      {
        category: deletedCategory._id,
      },
      {
        session,
      },
    );

    await session.commitTransaction();

    return deletedCategory;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

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
    item => item.slug === subCategorySlug,
  );
  if (!item) throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found!');

  const previousImage = item.image;
  let uploadedImage: string | undefined;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (imageFile) {
      const { secure_url } = await sendImageToCloudinary(imageFile);
      uploadedImage = secure_url;
    }

    Object.assign(item, payload, uploadedImage ? { image: uploadedImage } : {});
    const saved = await category.save({ session });

    if (payload.name || payload.slug) {
      const updateData: Record<string, unknown> = {};
      if (payload.name) updateData.subCategoryName = payload.name;
      if (payload.slug) updateData.subCategorySlug = payload.slug;

      await ProductModel.updateMany(
        { subCategorySlug: subCategorySlug },
        updateData,
        { session },
      );
    }

    await session.commitTransaction();

    if (uploadedImage && previousImage && previousImage !== uploadedImage) {
      await deleteImageFromCloudinary(previousImage);
    }

    return saved;
  } catch (error) {
    await session.abortTransaction();
    if (uploadedImage) {
      await deleteImageFromCloudinary(uploadedImage);
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

// 8. deleteCategorySubCategoryFromDB
const deleteCategorySubCategoryFromDB = async (
  categorySlug: string,
  subCategorySlug: string,
) => {
  const category = await CategoryModel.findOne({ slug: categorySlug });
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
  }

  const otherSubCategories = category.subCategories.filter(
    item => item.slug !== subCategorySlug,
  );

  if (otherSubCategories.length === category.subCategories.length) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found!');
  }

  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    category.subCategories = otherSubCategories;

    const result = await category.save({ session: mongoSession });

    if (!result) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Failed to delete sub category.',
      );
    }

    // ?? Delete products which are associated with this sub categories:
    await ProductModel.deleteMany(
      {
        category: category?._id,
        subCategorySlug: subCategorySlug,
      },
      {
        session: mongoSession,
      },
    );

    await mongoSession.commitTransaction();

    return result;
  } catch (error) {
    await mongoSession.abortTransaction();
    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

//
const getAllSubCategories = async (query: TGetAllSubCategoriesQueryType) => {
  const {
    limit,
    page,
    searchTerm,
    categoryId,
    categorySlug,
    sortBy = 'subCategorySlug',
    sortOrder = 'asc',
    includeInActive = false,
    skipLimitAndPagination = false,
  } = query;
  const currentLimit = limit || 10;
  const currentPage = page || 1;
  const skip = (currentPage - 1) * currentLimit;

  const pipeline: PipelineStage[] = [];

  if (categoryId) {
    pipeline.push({
      $match: {
        _id: new Types.ObjectId(categoryId),
      },
    });
  }

  if (categorySlug) {
    pipeline.push({
      $match: {
        slug: encodeURI(categorySlug),
      },
    });
  }

  if (!includeInActive) {
    pipeline.push({
      $match: {
        isActive: true,
      },
    });
  }

  pipeline.push({
    $unwind: '$subCategories',
  });

  if (!includeInActive) {
    pipeline.push({
      $match: {
        'subCategories.isActive': true,
      },
    });
  }

  pipeline.push({
    $lookup: {
      from: 'products',
      localField: 'subCategories.slug',
      foreignField: 'subCategorySlug',
      as: 'products',
      pipeline: [
        {
          $group: {
            _id: null,
            activeProducts: {
              $sum: {
                $cond: ['$isActive', 1, 0],
              },
            },
            inActiveProducts: {
              $sum: {
                $cond: ['$isActive', 0, 1],
              },
            },
            totalProducts: {
              $sum: 1,
            },
          },
        },
      ],
    },
  });

  pipeline.push({
    $addFields: {
      activeProducts: {
        $ifNull: [
          {
            $first: ['$products.activeProducts'],
          },
          0,
        ],
      },
      totalProducts: {
        $ifNull: [
          {
            $first: ['$products.totalProducts'],
          },
          0,
        ],
      },
      inActiveProducts: {
        $ifNull: [
          {
            $first: ['$products.inActiveProducts'],
          },
          0,
        ],
      },
    },
  });

  pipeline.push({
    $project: {
      _id: 0,
      subCategorySlug: '$subCategories.slug',
      subCategoryName: '$subCategories.name',
      subCategoryDescription: { $ifNull: ['$subCategories.description', null] },
      subCategoryMetaTile: { $ifNull: ['$subCategories.metaTitle', null] },
      subCategoryMetaDescription: {
        $ifNull: ['$subCategories.metaDescription', null],
      },
      isSubCategoryActive: { $ifNull: ['$subCategories.isActive', false] },
      subCategoryImage: { $ifNull: ['$subCategories.image', null] },
      subCategoryImageAlt: { $ifNull: ['$subCategories.imageAlt', null] },
      categoryId: '$_id',
      categoryName: '$name',
      categoryDescription: { $ifNull: ['$description', null] },
      categorySlug: '$slug',
      categoryMetaTile: { $ifNull: ['$metaTitle', null] },
      categoryMetaDescription: { $ifNull: ['$metaDescription', null] },
      isCategoryActive: { $ifNull: ['$isActive', false] },
      categoryImage: { $ifNull: ['$image', null] },
      activeProducts: '$activeProducts',
      inActiveProducts: '$inActiveProducts',
      totalProducts: '$totalProducts',
      createdAt: '$subCategories.createdAt',
      updatedAt: '$subCategories.updatedAt',
    },
  });

  const searchableFields = [
    'subCategorySlug',
    'subCategoryName',
    'subCategoryDescription',
    'categoryName',
    'categoryDescription',
    'categorySlug',
  ];

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: searchableFields.map(field => ({
          [field]: {
            $regex: searchTerm,
            $options: 'i',
          },
        })),
      },
    });
  }

  if (sortBy || sortOrder) {
    pipeline.push({
      $sort: {
        [sortBy]: sortOrder === 'asc' ? 1 : -1,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paginationStage: any = [
    {
      $match: {},
    },
  ];

  if (!skipLimitAndPagination) {
    paginationStage.push(
      {
        $skip: skip,
      },
      {
        $limit: currentLimit,
      },
    );
  }

  pipeline.push({
    $facet: {
      data: paginationStage,
      meta: [
        {
          $count: 'total',
        },
      ],
    },
  });

  const result = await CategoryModel.aggregate(pipeline);

  const data = result?.[0]?.data;
  const total = result?.[0]?.meta?.[0]?.total || 0;

  const totalPages = Math.ceil(total / currentLimit) || 1;

  return {
    data,
    meta: {
      page: currentPage,
      limit: currentLimit,
      total,
      totalPages,
    },
  };
};

const getSubCategoryBySlug = async (slug: string) => {
  const pipeline: PipelineStage[] = [];

  pipeline.push({
    $unwind: {
      path: '$subCategories',
      preserveNullAndEmptyArrays: true,
    },
  });

  pipeline.push({
    $project: {
      _id: 0,
      subCategoryName: { $ifNull: ['$subCategories.name', null] },
      subCategorySlug: { $ifNull: ['$subCategories.slug', null] },
      subCategoryDescription: { $ifNull: ['$subCategories.description', null] },
      subCategoryIsActive: { $ifNull: ['$subCategories.isActive', false] },
      subCategoryMetaTitle: { $ifNull: ['$subCategories.metaTitle', null] },
      subCategoryImage: { $ifNull: ['$subCategories.image', null] },
      subCategoryMetaDescription: {
        $ifNull: ['$subCategories.metaDescription', null],
      },

      categoryId: { $ifNull: ['$_id', null] },
      categorySlug: { $ifNull: ['$slug', null] },
      categoryName: { $ifNull: ['$name', null] },
      categoryDescription: { $ifNull: ['$description', null] },
      categoryMetaTitle: { $ifNull: ['$metaTitle', null] },
      categoryMetaDescription: { $ifNull: ['$metaDescription', null] },
      categoryImage: { $ifNull: ['$image', null] },
      categoryIsActive: { $ifNull: ['$isActive', false] },
    },
  });

  pipeline.push({
    $match: {
      subCategorySlug: encodeURI(slug),
    },
  });

  const subcategory = await CategoryModel.aggregate(pipeline);

  if (!subcategory[0]) {
    throw new AppError(httpStatus.NOT_FOUND);
  }

  return subcategory[0];
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
  getAllSubCategories,
  getSubCategoryBySlug,
};
