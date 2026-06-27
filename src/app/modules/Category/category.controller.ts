import httpStatus from 'http-status';
import { AppError, asyncHandler, sendResponse } from '../../utils';
import { CategoryService } from './category.service';
import { getParam } from '../../lib/getParam';

// 1. createCategory
const createCategory = asyncHandler(async (req, res) => {
  const result = await CategoryService.createCategoryIntoDB(req.body, req.file);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Category created successfully!',
    data: result,
  });
});

// 2. getAllCategories
const getAllCategories = asyncHandler(async (_req, res) => {
  const result = await CategoryService.getAllCategoriesFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Categories fetched successfully!',
    data: result,
  });
});

// 3. getActiveCategories
const getActiveCategories = asyncHandler(async (_req, res) => {
  const result = await CategoryService.getActiveCategoriesFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Active categories fetched successfully!',
    data: result,
  });
});

// 4. getCategory
const getCategory = asyncHandler(async (req, res) => {
  const result = await CategoryService.getCategoryBySlugFromDB(
    getParam(req.params.slug),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Category fetched successfully!',
    data: result,
  });
});

// 5. getActiveCategory
const getActiveCategory = asyncHandler(async (req, res) => {
  const result = await CategoryService.getActiveCategoryBySlugFromDB(
    getParam(req.params.slug),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Active category fetched successfully!',
    data: result,
  });
});

// 4. updateCategory
const updateCategory = asyncHandler(async (req, res) => {
  const result = await CategoryService.updateCategoryIntoDB(
    getParam(req.params.slug),
    req.body,
    req.file,
  );

  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Category updated successfully!',
    data: result,
  });
});

// 5. deleteCategory
const deleteCategory = asyncHandler(async (req, res) => {
  const result = await CategoryService.deleteCategoryFromDB(
    getParam(req.params.slug),
  );

  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Category deleted successfully!',
    data: result,
  });
});

// 6. createCategorySubCategory
const createCategorySubCategory = asyncHandler(async (req, res) => {
  const result = await CategoryService.createCategorySubCategoryIntoDB(
    getParam(req.params.slug),
    req.body,
    req.file,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Subcategory created successfully!',
    data: result,
  });
});

// 7. updateCategorySubCategory
const updateCategorySubCategory = asyncHandler(async (req, res) => {
  const result = await CategoryService.updateCategorySubCategoryIntoDB(
    getParam(req.params.slug),
    getParam(req.params.subCategorySlug),
    req.body,
    req.file,
  );

  if (!result)
    throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found!');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Subcategory updated successfully!',
    data: result,
  });
});

// 8. deleteCategorySubCategory
const deleteCategorySubCategory = asyncHandler(async (req, res) => {
  const result = await CategoryService.deleteCategorySubCategoryFromDB(
    getParam(req.params.slug),
    getParam(req.params.subCategorySlug),
  );

  if (!result)
    throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found!');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Subcategory deleted successfully!',
    data: result,
  });
});

export const CategoryController = {
  createCategory,
  getAllCategories,
  getActiveCategories,
  getCategory,
  getActiveCategory,
  updateCategory,
  deleteCategory,
  createCategorySubCategory,
  updateCategorySubCategory,
  deleteCategorySubCategory,
};
