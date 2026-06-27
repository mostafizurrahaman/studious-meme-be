import { Router } from 'express';
import {
  adminLimiter,
  auth,
  burstProtection,
  publicLimiter,
  validateRequest,
} from '../../middlewares';
import { ROLE } from '../User/user.constant';
import { CouponController } from './coupon.controller';
import { CouponValidation } from './coupon.validation';

const router = Router();

// 1. verifyCoupon
router
  .route('/verify')
  .post(
    publicLimiter,
    validateRequest(CouponValidation.couponVerifySchema),
    CouponController.verifyCoupon,
  );

// 2. createCoupon
router
  .route('/admin')
  .post(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    validateRequest(CouponValidation.couponCreateSchema),
    CouponController.createCoupon,
  )
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    CouponController.getAllCoupons,
  );

// 3. getCoupon, updateCoupon
router
  .route('/admin/:couponId')
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    CouponController.getCoupon,
  )
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    validateRequest(CouponValidation.couponUpdateSchema),
    CouponController.updateCoupon,
  );

// 4. deleteCoupon
router
  .route('/admin/:couponId')
  .delete(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    CouponController.deleteCoupon,
  );

// 5. updateCouponStatus
router
  .route('/admin/:couponId/status')
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    validateRequest(CouponValidation.couponStatusSchema),
    CouponController.updateCouponStatus,
  );

export const CouponRoutes = router;
