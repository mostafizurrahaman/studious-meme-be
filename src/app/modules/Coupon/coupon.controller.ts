import httpStatus from 'http-status';
import { asyncHandler, sendResponse } from '../../utils';
import { CouponService } from './coupon.service';

const getSingleParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

// 1. verifyCoupon
const verifyCoupon = asyncHandler(async (req, res) => {
  const result = await CouponService.verifyCouponFromDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: result.message,
    data: result,
  });
});

// 2. createCoupon
const createCoupon = asyncHandler(async (req, res) => {
  const result = await CouponService.createCouponIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Coupon created successfully!',
    data: result,
  });
});

// 3. getAllCoupons
const getAllCoupons = asyncHandler(async (req, res) => {
  const result = await CouponService.getAllCouponsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Coupons fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

// 4. getCoupon
const getCoupon = asyncHandler(async (req, res) => {
  const result = await CouponService.getCouponByIdFromDB(
    getSingleParam(req.params.couponId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Coupon fetched successfully!',
    data: result,
  });
});

// 5. updateCoupon
const updateCoupon = asyncHandler(async (req, res) => {
  const result = await CouponService.updateCouponIntoDB(
    getSingleParam(req.params.couponId),
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Coupon updated successfully!',
    data: result,
  });
});

// 6. updateCouponStatus
const updateCouponStatus = asyncHandler(async (req, res) => {
  const result = await CouponService.updateCouponStatusIntoDB(
    getSingleParam(req.params.couponId),
    req.body.isActive,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Coupon status updated successfully!',
    data: result,
  });
});

// 7. deleteCoupon
const deleteCoupon = asyncHandler(async (req, res) => {
  const result = await CouponService.deleteCouponFromDB(
    getSingleParam(req.params.couponId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Coupon deleted successfully!',
    data: result,
  });
});

export const CouponController = {
  verifyCoupon,
  createCoupon,
  getAllCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  updateCouponStatus,
};
