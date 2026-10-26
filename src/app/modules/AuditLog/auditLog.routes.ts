import { Router } from 'express';
import { adminLimiter, auth } from '../../middlewares';
import { ROLE } from '../User/user.constant';
import { AuditLogController } from './auditLog.controller';

const router = Router();

// 1. getAuditLogStats
router
  .route('/stats')
  .get(
    auth(ROLE.SUPER_ADMIN, ROLE.ADMIN),
    adminLimiter,
    AuditLogController.getAuditLogStats,
  );

// 2. getAllAuditLogs
router
  .route('/')
  .get(
    auth(ROLE.SUPER_ADMIN, ROLE.ADMIN),
    adminLimiter,
    AuditLogController.getAllAuditLogs,
  );

// 3. getAuditLogById
router
  .route('/:id')
  .get(
    auth(ROLE.SUPER_ADMIN, ROLE.ADMIN),
    adminLimiter,
    AuditLogController.getAuditLogById,
  );

export const AuditLogRoutes = router;
