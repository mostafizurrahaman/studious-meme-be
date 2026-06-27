import { Router } from 'express';
import {
  actionLimiter,
  auth,
  burstProtection,
  duplicateSubmissionGuard,
  publicLimiter,
  validateRequest,
} from '../../middlewares';
import { ROLE } from '../User/user.constant';
import { ProductQuestionController } from './productQuestion.controller';
import { ProductQuestionValidation } from './productQuestion.validation';

const router = Router();

router
  .route('/')
  .post(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    burstProtection('action', 10_000, 12),
    duplicateSubmissionGuard(),
    validateRequest(ProductQuestionValidation.createQuestionSchema),
    ProductQuestionController.createQuestion,
  );

router
  .route('/product/:productId')
  .get(
    publicLimiter,
    validateRequest(ProductQuestionValidation.publicQuestionListSchema),
    ProductQuestionController.getAnsweredQuestionsForProduct,
  );

export const ProductQuestionRoutes = router;
