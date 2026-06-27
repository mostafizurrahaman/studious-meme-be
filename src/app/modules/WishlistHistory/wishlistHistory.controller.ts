import httpStatus from 'http-status';
import { asyncHandler, sendResponse } from '../../utils';
import { WishlistHistoryService } from './wishlistHistory.service';

const getSingleParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const addWishlistItem = asyncHandler(async (req, res) => {
  const result = await WishlistHistoryService.addWishlistItemIntoDB(
    req.user,
    req.body.productId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Product saved to wishlist successfully!',
    data: result,
  });
});

const removeWishlistItem = asyncHandler(async (req, res) => {
  const result = await WishlistHistoryService.removeWishlistItemFromDB(
    req.user,
    getSingleParam(req.params.productId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Product removed from wishlist successfully!',
    data: result,
  });
});

const getMyWishlist = asyncHandler(async (req, res) => {
  const result = await WishlistHistoryService.getMyWishlistFromDB(req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Wishlist list fetched successfully!',
    data: result,
  });
});

const getAllWishlist = asyncHandler(async (req, res) => {
  const result = await WishlistHistoryService.getAllWishlistFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Wishlist records fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

const getWishlistInsights = asyncHandler(async (_req, res) => {
  const result = await WishlistHistoryService.getWishlistInsightsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Wishlist insights fetched successfully!',
    data: result,
  });
});

export const WishlistHistoryController = {
  addWishlistItem,
  removeWishlistItem,
  getMyWishlist,
  getAllWishlist,
  getWishlistInsights,
};
