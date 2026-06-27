import { Router } from 'express';
import {
  adminLimiter,
  auth,
  burstProtection,
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
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    validateRequest(ProductReviewValidation.adminReviewListSchema),
    ProductReviewController.getAllReviews,
  )
  .post(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.fields([
      { name: 'displayImage', maxCount: 1 },
      { name: 'images', maxCount: 5 },
    ]),
    validateRequestFromFormData(
      ProductReviewValidation.manualCreateReviewSchema,
    ),
    ProductReviewController.createManualReview,
  );

router
  .route('/:id')
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.fields([
      { name: 'displayImage', maxCount: 1 },
      { name: 'images', maxCount: 5 },
    ]),
    validateRequestFromFormData(ProductReviewValidation.updateReviewSchema),
    ProductReviewController.updateReview,
  )
  .delete(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    validateRequest(ProductReviewValidation.reviewIdParamsSchema),
    ProductReviewController.deleteReview,
  );

router
  .route('/:id/status')
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    validateRequest(ProductReviewValidation.updateReviewStatusSchema),
    ProductReviewController.updateReviewStatus,
  );

export const ProductReviewAdminRoutes = router;
