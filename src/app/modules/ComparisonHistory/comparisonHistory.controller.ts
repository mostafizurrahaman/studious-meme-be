import httpStatus from 'http-status';
import { asyncHandler, sendResponse } from '../../utils';
import { ComparisonHistoryService } from './comparisonHistory.service';

// 1. addComparisonItem
const addComparisonItem = asyncHandler(async (req, res) => {
  const { productId } = req.body as { productId: string };
  const result = await ComparisonHistoryService.addComparisonItemIntoDB(
    req.user,
    productId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Added to compare successfully!',
    data: result,
  });
});

// 2. getMyComparisonHistory
const getMyComparisonHistory = asyncHandler(async (req, res) => {
  const result = await ComparisonHistoryService.getMyComparisonHistoryFromDB(
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Compare list fetched successfully!',
    data: result,
  });
});

// 3. removeComparisonItem
const removeComparisonItem = asyncHandler(async (req, res) => {
  const productId = Array.isArray(req.params.productId)
    ? req.params.productId[0]
    : req.params.productId;
  const result = await ComparisonHistoryService.removeComparisonItemFromDB(
    req.user,
    productId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Removed from compare successfully!',
    data: result,
  });
});

// 4. getAllComparisonHistory
const getAllComparisonHistory = asyncHandler(async (req, res) => {
  const result = await ComparisonHistoryService.getAllComparisonHistoryFromDB(
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Comparison activity fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

// 5. getComparisonInsights
const getComparisonInsights = asyncHandler(async (_req, res) => {
  const result = await ComparisonHistoryService.getComparisonInsightsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Comparison insights fetched successfully!',
    data: result,
  });
});

export const ComparisonHistoryController = {
  addComparisonItem,
  getMyComparisonHistory,
  removeComparisonItem,
  getAllComparisonHistory,
  getComparisonInsights,
};
