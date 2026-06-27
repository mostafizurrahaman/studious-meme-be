import { Router } from 'express';
import {
  actionLimiter,
  adminLimiter,
  auth,
  burstProtection,
  duplicateSubmissionGuard,
  validateRequest,
} from '../../middlewares';
import { ROLE } from '../User/user.constant';
import { WishlistHistoryController } from './wishlistHistory.controller';
import { WishlistHistoryValidation } from './wishlistHistory.validation';

const router = Router();

router
  .route('/')
  .get(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    WishlistHistoryController.getMyWishlist,
  )
  .post(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    burstProtection('action', 10_000, 12),
    duplicateSubmissionGuard(),
    validateRequest(WishlistHistoryValidation.wishlistProductSchema),
    WishlistHistoryController.addWishlistItem,
  );

router
  .route('/admin')
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    WishlistHistoryController.getAllWishlist,
  );

router
  .route('/admin/summary')
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    WishlistHistoryController.getWishlistInsights,
  );

router
  .route('/:productId')
  .delete(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    WishlistHistoryController.removeWishlistItem,
  );

export const WishlistHistoryRoutes = router;
