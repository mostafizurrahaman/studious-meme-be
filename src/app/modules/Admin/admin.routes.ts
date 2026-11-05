import { Router } from 'express';
import {
  adminLimiter,
  auth,
  burstProtection,
  validateRequest,
  validateRequestFromFormData,
} from '../../middlewares';
import { multerUpload } from '../../lib';
import { ROLE } from '../User/user.constant';
import { AdminController } from './admin.controller';
import { AdminValidation } from './admin.validation';

const router = Router();

// 1. createAdmin
router
  .route('/admins')
  .post(
    auth(ROLE.SUPER_ADMIN, ROLE.ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 12),
    multerUpload.single('image'),
    validateRequestFromFormData(AdminValidation.adminCreateSchema),
    AdminController.createAdmin,
  )
  .get(
    auth(ROLE.SUPER_ADMIN, ROLE.ADMIN),
    adminLimiter,
    AdminController.getAllAdmins,
  );

// 2. changeStaffPassword
router
  .route('/admins/:userId/password')
  .patch(
    auth(ROLE.SUPER_ADMIN, ROLE.ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 10),
    validateRequest(AdminValidation.changeStaffPasswordSchema),
    AdminController.changeStaffPassword,
  );

// 3. getAdmin, updateAdmin, deleteAdmin
router
  .route('/admins/:userId')
  .get(
    auth(ROLE.SUPER_ADMIN, ROLE.ADMIN),
    adminLimiter,
    AdminController.getAdmin,
  )
  .patch(
    auth(ROLE.SUPER_ADMIN, ROLE.ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 12),
    multerUpload.single('image'),
    validateRequestFromFormData(AdminValidation.adminUpdateSchema),
    AdminController.updateAdmin,
  )
  .delete(auth(ROLE.SUPER_ADMIN), adminLimiter, AdminController.deleteAdmin);

export const AdminRoutes = router;
