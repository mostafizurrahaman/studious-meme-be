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
import { CartController } from './cart.controller';
import { CartValidation } from './cart.validation';

const router = Router();

router
  .route('/')
  .get(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    CartController.getMyCart,
  );

router
  .route('/items')
  .post(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    burstProtection('action', 10_000, 12),
    duplicateSubmissionGuard(),
    validateRequest(CartValidation.cartAddSchema),
    CartController.addCartItem,
  )
  .patch(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    validateRequest(CartValidation.cartUpdateSchema),
    CartController.updateCartItem,
  );

router
  .route('/items/:productId')
  .delete(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    CartController.removeCartItem,
  );

router
  .route('/clear')
  .delete(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    CartController.clearCart,
  );

router
  .route('/admin')
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    CartController.getAllCarts,
  );

router
  .route('/admin/summary')
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    CartController.getCartInsights,
  );

export const CartRoutes = router;
