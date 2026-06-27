import httpStatus from 'http-status';
import { asyncHandler, sendResponse } from '../../utils';
import { CartService } from './cart.service';

const getSingleParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const getMyCart = asyncHandler(async (req, res) => {
  const result = await CartService.getMyCartFromDB(req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Cart fetched successfully!',
    data: result,
  });
});

const addCartItem = asyncHandler(async (req, res) => {
  const result = await CartService.addCartItemIntoDB(
    req.user,
    req.body.productId,
    req.body.quantity ?? 1,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Added to cart successfully!',
    data: result,
  });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const result = await CartService.updateCartItemIntoDB(
    req.user,
    req.body.productId,
    req.body.quantity,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Cart item updated successfully!',
    data: result,
  });
});

const removeCartItem = asyncHandler(async (req, res) => {
  const result = await CartService.removeCartItemFromDB(
    req.user,
    getSingleParam(req.params.productId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Cart item removed successfully!',
    data: result,
  });
});

const clearCart = asyncHandler(async (req, res) => {
  const result = await CartService.clearCartFromDB(req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Cart cleared successfully!',
    data: result,
  });
});

const getAllCarts = asyncHandler(async (req, res) => {
  const result = await CartService.getAllCartsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Cart records fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

const getCartInsights = asyncHandler(async (_req, res) => {
  const result = await CartService.getCartInsightsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Cart insights fetched successfully!',
    data: result,
  });
});

export const CartController = {
  getMyCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
  getAllCarts,
  getCartInsights,
};
