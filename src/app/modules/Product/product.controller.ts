import httpStatus from 'http-status';
import { AppError, asyncHandler, sendResponse } from '../../utils';
import { ProductService } from './product.service';
import { getParam } from '../../lib/getParam';

// 1. createProduct
const createProduct = asyncHandler(async (req, res) => {
  const result = await ProductService.createProductIntoDB(req.body, req.files);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Product created successfully!',
    data: result,
  });
});

// 2. getAllProducts
const getAllProducts = asyncHandler(async (req, res) => {
  const result = await ProductService.getAllProductsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Products fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

// 3. getAllActiveProducts
const getAllActiveProducts = asyncHandler(async (req, res) => {
  const result = await ProductService.getAllActiveProductsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Active products fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

// 4. getProduct
const getProduct = asyncHandler(async (req, res) => {
  const result = await ProductService.getProductBySlugFromDB(
    getParam(req.params.slug),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Product fetched successfully!',
    data: result,
  });
});

// 4. getActiveProduct
const getActiveProduct = asyncHandler(async (req, res) => {
  const result = await ProductService.getActiveProductBySlugFromDB(
    getParam(req.params.slug),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Active product fetched successfully!',
    data: result,
  });
});

// 5. updateProduct
const updateProduct = asyncHandler(async (req, res) => {
  const result = await ProductService.updateProductIntoDB(
    getParam(req.params.slug),
    req.body,
    req.files,
  );

  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Product updated successfully!',
    data: result,
  });
});

// 5. deleteProduct
const deleteProduct = asyncHandler(async (req, res) => {
  const result = await ProductService.deleteProductFromDB(
    getParam(req.params.slug),
  );

  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Product deleted successfully!',
    data: result,
  });
});

// 6. getProductsByCategorySlug
const getProductsByCategorySlug = asyncHandler(async (req, res) => {
  const result = await ProductService.getProductsByCategorySlugFromDB(
    getParam(req.params.slug),
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Products fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

// 7. getProductsBySubCategorySlug
const getProductsBySubCategorySlug = asyncHandler(async (req, res) => {
  const result = await ProductService.getProductsBySubCategorySlugFromDB(
    getParam(req.params.subCategorySlug),
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Products fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

// 8. searchProducts
const searchProducts = asyncHandler(async (req, res) => {
  const searchTerm = String(req.query.query || '');

  const limit = (() => {
    const parsed = Number(req.query.limit);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 10;
  })();

  const result = await ProductService.searchProducts(searchTerm, limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Search results fetched successfully!',
    data: result,
  });
});

export const ProductController = {
  createProduct,
  getAllProducts,
  getAllActiveProducts,
  getProduct,
  getActiveProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategorySlug,
  getProductsBySubCategorySlug,
  searchProducts,
};
