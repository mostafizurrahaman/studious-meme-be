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
import { ProductController } from './product.controller';
import { ProductValidation } from './product.validation';

const router = Router();

// 1. createProduct
router
  .route('/products')
  .post(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.array('images', 5),
    validateRequestFromFormData(ProductValidation.productCreateSchema),
    ProductController.createProduct,
  )
  .get(publicLimiter, ProductController.getAllProducts);

// 2. public active product list/detail
router
  .route('/products/active')
  .get(publicLimiter, ProductController.getAllActiveProducts);
router
  .route('/products/active/:slug')
  .get(publicLimiter, ProductController.getActiveProduct);

// 2. getProduct, updateProduct, deleteProduct
router
  .route('/products/:slug')
  .get(publicLimiter, ProductController.getProduct)
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.array('images', 5),
    validateRequestFromFormData(ProductValidation.productUpdateSchema),
    ProductController.updateProduct,
  )
  .delete(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    ProductController.deleteProduct,
  );

// 3. getProductsByCategorySlug
router
  .route('/products/by-category/:slug')
  .get(publicLimiter, ProductController.getProductsByCategorySlug);
// 4. getProductsBySubCategorySlug
router
  .route('/products/by-sub-category/:subCategorySlug')
  .get(publicLimiter, ProductController.getProductsBySubCategorySlug);

// 5. search products with keyword suggestions
router.route('/search').get(publicLimiter, ProductController.searchProducts);

export const ProductRoutes = router;
