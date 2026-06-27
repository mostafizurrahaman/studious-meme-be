import { Router } from 'express';
import {
  actionLimiter,
  adminLimiter,
  auth,
  burstProtection,
  duplicateSubmissionGuard,
  paymentWebhookGuard,
  publicLimiter,
} from '../../middlewares';
import { ROLE } from '../User/user.constant';
import { PaymentController } from './payment.controller';

const router = Router();

// 1. initiatePortPosPayment
router
  .route('/portpos/init/:orderId')
  .post(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    burstProtection('payment', 10_000, 8),
    duplicateSubmissionGuard(),
    PaymentController.initiatePortPosPayment,
  );

// 2. portPosIpn // Instant Payment Notification
router
  .route('/portpos/ipn')
  .post(paymentWebhookGuard, PaymentController.portPosIpn);

// 3. verifyPortPosPayment
router
  .route('/portpos/verify/:orderId')
  .get(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    publicLimiter,
    PaymentController.verifyPortPosPayment,
  );

// 4. refundPortPosPayment
router
  .route('/portpos/refund/:orderId')
  .post(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    PaymentController.refundPortPosPayment,
  );

// 5. getMyPayments
router
  .route('/my-payments')
  .get(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    PaymentController.getMyPayments,
  );

// 6. getAllPaymentsForAdmin
router
  .route('/admin')
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    PaymentController.getAllPaymentsForAdmin,
  );

export const PaymentRoutes = router;
