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
import { CategoryController } from './category.controller';
import { CategoryValidation } from './category.validation';

const router = Router();

// 1. createCategory
router
  .route('/categories')
  .post(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.single('image'),
    validateRequestFromFormData(CategoryValidation.categoryCreateSchema),
    CategoryController.createCategory,
  )
  .get(publicLimiter, CategoryController.getAllCategories);

// 2. public active categories
router
  .route('/categories/active')
  .get(publicLimiter, CategoryController.getActiveCategories);
router
  .route('/categories/active/:slug')
  .get(publicLimiter, CategoryController.getActiveCategory);

// 2. getCategory, updateCategory, deleteCategory
router
  .route('/categories/:slug')
  .get(publicLimiter, CategoryController.getCategory)
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.single('image'),
    validateRequestFromFormData(CategoryValidation.categoryUpdateSchema),
    CategoryController.updateCategory,
  )
  .delete(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    CategoryController.deleteCategory,
  );

// 3. createCategorySubCategory
router
  .route('/categories/:slug/sub-categories')
  .post(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.single('image'),
    validateRequestFromFormData(
      CategoryValidation.categorySubCategoryCreateSchema,
    ),
    CategoryController.createCategorySubCategory,
  );

// 4. updateCategorySubCategory, deleteCategorySubCategory
router
  .route('/categories/:slug/sub-categories/:subCategorySlug')
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.single('image'),
    validateRequestFromFormData(
      CategoryValidation.categorySubCategoryUpdateSchema,
    ),
    CategoryController.updateCategorySubCategory,
  )
  .delete(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    CategoryController.deleteCategorySubCategory,
  );

export const CategoryRoutes = router;
