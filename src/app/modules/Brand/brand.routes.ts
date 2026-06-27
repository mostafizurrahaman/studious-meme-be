import { Router } from 'express';
import {
  adminLimiter,
  auth,
  burstProtection,
  publicLimiter,
  validateRequestFromFormData,
} from '../../middlewares';
import { multerUpload } from '../../lib';
import { ROLE } from '../User/user.constant';
import { BrandController } from './brand.controller';
import { BrandValidation } from './brand.validation';

const router = Router();

// 1. createBrand
router
  .route('/brands')
  .post(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.single('image'),
    validateRequestFromFormData(BrandValidation.brandCreateSchema),
    BrandController.createBrand,
  )
  .get(publicLimiter, BrandController.getAllBrands);

// 2. public active brands
router
  .route('/brands/active')
  .get(publicLimiter, BrandController.getActiveBrands);
router
  .route('/brands/active/:slug')
  .get(publicLimiter, BrandController.getActiveBrand);

// 2. getBrand, updateBrand, deleteBrand
router
  .route('/brands/:slug')
  .get(publicLimiter, BrandController.getBrand)
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.single('image'),
    validateRequestFromFormData(BrandValidation.brandUpdateSchema),
    BrandController.updateBrand,
  )
  .delete(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    BrandController.deleteBrand,
  );

export const BrandRoutes = router;
