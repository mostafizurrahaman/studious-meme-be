import { Router } from 'express';
import {
  actionLimiter,
  adminLimiter,
  auth,
  burstProtection,
  duplicateSubmissionGuard,
  validateRequest,
} from '../../middlewares';
import { ComparisonHistoryController } from './comparisonHistory.controller';
import { ComparisonHistoryValidation } from './comparisonHistory.validation';
import { ROLE } from '../User/user.constant';

const router = Router();

router
  .route('/')
  .get(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    ComparisonHistoryController.getMyComparisonHistory,
  )
  .post(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    burstProtection('action', 10_000, 12),
    duplicateSubmissionGuard(),
    validateRequest(ComparisonHistoryValidation.compareSchema),
    ComparisonHistoryController.addComparisonItem,
  );

router
  .route('/my-items')
  .get(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    ComparisonHistoryController.getMyComparisonHistory,
  );

// 3. getAllComparisonHistory
router
  .route('/admin')
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    ComparisonHistoryController.getAllComparisonHistory,
  );

router
  .route('/admin/summary')
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    ComparisonHistoryController.getComparisonInsights,
  );

router
  .route('/:productId')
  .delete(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    ComparisonHistoryController.removeComparisonItem,
  );

export const ComparisonHistoryRoutes = router;
