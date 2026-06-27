import { Router } from 'express';
import {
  actionLimiter,
  auth,
  burstProtection,
  duplicateSubmissionGuard,
  publicLimiter,
  validateRequestFromFormData,
  validateRequest,
} from '../../middlewares';
import { multerUpload } from '../../lib';
import { ROLE } from '../User/user.constant';
import { ProductReviewController } from './productReview.controller';
import { ProductReviewValidation } from './productReview.validation';

const router = Router();

router
  .route('/')
  .post(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    burstProtection('action', 10_000, 12),
    duplicateSubmissionGuard(),
    multerUpload.array('images', 5),
    validateRequestFromFormData(
      ProductReviewValidation.customerCreateReviewSchema,
    ),
    ProductReviewController.createCustomerReview,
  );

router
  .route('/product/:productId')
  .get(
    publicLimiter,
    validateRequest(ProductReviewValidation.publicReviewListSchema),
    ProductReviewController.getApprovedReviewsForProduct,
  );

export const ProductReviewRoutes = router;
