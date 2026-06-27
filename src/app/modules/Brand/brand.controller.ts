import httpStatus from 'http-status';
import { AppError, asyncHandler, sendResponse } from '../../utils';
import { BrandService } from './brand.service';
import { getParam } from '../../lib/getParam';

// 1. createBrand
const createBrand = asyncHandler(async (req, res) => {
  const result = await BrandService.createBrandIntoDB(req.body, req.file);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Brand created successfully!',
    data: result,
  });
});

// 2. getAllBrands
const getAllBrands = asyncHandler(async (req, res) => {
  const result = await BrandService.getAllBrandsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Brands fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

// 3. getActiveBrands
const getActiveBrands = asyncHandler(async (_req, res) => {
  const result = await BrandService.getActiveBrandsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Active brands fetched successfully!',
    data: result,
  });
});

// 4. getBrand
const getBrand = asyncHandler(async (req, res) => {
  const result = await BrandService.getBrandBySlugFromDB(
    getParam(req.params.slug),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Brand fetched successfully!',
    data: result,
  });
});

// 5. getActiveBrand
const getActiveBrand = asyncHandler(async (req, res) => {
  const result = await BrandService.getActiveBrandBySlugFromDB(
    getParam(req.params.slug),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Active brand fetched successfully!',
    data: result,
  });
});

// 4. updateBrand
const updateBrand = asyncHandler(async (req, res) => {
  const result = await BrandService.updateBrandIntoDB(
    getParam(req.params.slug),
    req.body,
    req.file,
  );

  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Brand not found!');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Brand updated successfully!',
    data: result,
  });
});

// 5. deleteBrand
const deleteBrand = asyncHandler(async (req, res) => {
  const result = await BrandService.deleteBrandFromDB(
    getParam(req.params.slug),
  );

  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Brand not found!');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Brand deleted successfully!',
    data: result,
  });
});

export const BrandController = {
  createBrand,
  getAllBrands,
  getActiveBrands,
  getBrand,
  getActiveBrand,
  updateBrand,
  deleteBrand,
};
