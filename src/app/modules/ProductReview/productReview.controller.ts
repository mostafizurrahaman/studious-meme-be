import httpStatus from 'http-status';
import type { Express } from 'express';
import { asyncHandler, sendResponse } from '../../utils';
import { uploadFilesAndInjectUrls } from '../../lib';
import { ProductReviewService } from './productReview.service';

const getParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const flattenUploadedFiles = (
  files:
    | Express.Multer.File[]
    | Record<string, Express.Multer.File[]>
    | undefined,
) => (Array.isArray(files) ? files : Object.values(files ?? {}).flat());

const createCustomerReview = asyncHandler(async (req, res) => {
  const payload = await uploadFilesAndInjectUrls(
    req.body,
    flattenUploadedFiles(req.files),
  );
  const result = await ProductReviewService.createCustomerReviewIntoDB(
    req.user,
    payload,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Review submitted successfully!',
    data: result,
  });
});

const createManualReview = asyncHandler(async (req, res) => {
  const payload = await uploadFilesAndInjectUrls(
    req.body,
    flattenUploadedFiles(req.files),
  );
  const result = await ProductReviewService.createManualReviewIntoDB(
    req.user,
    payload,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Manual review created successfully!',
    data: result,
  });
});

const getApprovedReviewsForProduct = asyncHandler(async (req, res) => {
  const result = await ProductReviewService.getApprovedReviewsForProductFromDB(
    getParam(req.params.productId),
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Product reviews fetched successfully!',
    data: result.data,
    meta: result.meta,
    summary: result.summary,
  });
});

const getAllReviews = asyncHandler(async (req, res) => {
  const result = await ProductReviewService.getAllReviewsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Product reviews fetched successfully!',
    data: result.data,
    meta: result.meta,
    summary: result.summary,
  });
});

const updateReview = asyncHandler(async (req, res) => {
  const payload = await uploadFilesAndInjectUrls(
    req.body,
    flattenUploadedFiles(req.files),
  );
  const result = await ProductReviewService.updateReviewIntoDB(
    getParam(req.params.id),
    payload,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Review updated successfully!',
    data: result,
  });
});

const updateReviewStatus = asyncHandler(async (req, res) => {
  const result = await ProductReviewService.updateReviewStatusIntoDB(
    getParam(req.params.id),
    req.body.status,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Review status updated successfully!',
    data: result,
  });
});

const deleteReview = asyncHandler(async (req, res) => {
  const result = await ProductReviewService.deleteReviewFromDB(
    getParam(req.params.id),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Review deleted successfully!',
    data: result,
  });
});

export const ProductReviewController = {
  createCustomerReview,
  createManualReview,
  getApprovedReviewsForProduct,
  getAllReviews,
  updateReview,
  updateReviewStatus,
  deleteReview,
};
