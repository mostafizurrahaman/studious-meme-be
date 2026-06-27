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
import { OrderController } from './order.controller';
import { OrderValidation } from './order.validation';

const router = Router();

// 1. previewCheckout
router
  .route('/checkout-preview')
  .post(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    burstProtection('action', 10_000, 12),
    validateRequest(OrderValidation.orderCheckoutPreviewSchema),
    OrderController.previewCheckout,
  );

// 2. createOrder
router
  .route('/checkout')
  .post(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    burstProtection('action', 10_000, 12),
    duplicateSubmissionGuard(),
    validateRequest(OrderValidation.createOrderSchema),
    OrderController.createOrder,
  );

// 3. getMyOrders
router
  .route('/my-orders')
  .get(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    OrderController.getMyOrders,
  );

// 4. getMySingleOrder
router
  .route('/my-orders/:orderId')
  .get(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    OrderController.getMySingleOrder,
  );

// 5. getSingleOrder
router
  .route('/orders/:orderId')
  .get(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    OrderController.getSingleOrder,
  );

// 6. getAllOrdersForAdmin
router
  .route('/admin/orders')
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    OrderController.getAllOrdersForAdmin,
  );

// 7. updateOrderStatus
router
  .route('/admin/orders/:orderId/status')
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    validateRequest(OrderValidation.updateOrderStatusSchema),
    OrderController.updateOrderStatus,
  );

export const OrderRoutes = router;
