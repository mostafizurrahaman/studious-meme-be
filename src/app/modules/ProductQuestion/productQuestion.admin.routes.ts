import { Router } from 'express';
import {
  adminLimiter,
  auth,
  burstProtection,
  validateRequest,
} from '../../middlewares';
import { ROLE } from '../User/user.constant';
import { ProductQuestionController } from './productQuestion.controller';
import { ProductQuestionValidation } from './productQuestion.validation';

const router = Router();

router
  .route('/')
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    validateRequest(ProductQuestionValidation.adminQuestionListSchema),
    ProductQuestionController.getAllQuestions,
  );

router
  .route('/:id/answer')
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    validateRequest(ProductQuestionValidation.answerQuestionSchema),
    ProductQuestionController.answerQuestion,
  );

router
  .route('/:id/status')
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    validateRequest(ProductQuestionValidation.updateQuestionStatusSchema),
    ProductQuestionController.updateQuestionStatus,
  );

router
  .route('/:id')
  .delete(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    validateRequest(ProductQuestionValidation.questionIdParamsSchema),
    ProductQuestionController.deleteQuestion,
  );

export const ProductQuestionAdminRoutes = router;
