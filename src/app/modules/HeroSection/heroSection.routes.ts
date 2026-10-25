import { Router } from 'express';
import {
  adminLimiter,
  auth,
  burstProtection,
  publicLimiter,
  validateRequest,
  validateRequestFromFormData,
} from '../../middlewares';
import { multerUpload } from '../../lib';
import { ROLE } from '../User/user.constant';
import { HeroSectionController } from './heroSection.controller';
import { HeroSectionValidation } from './heroSection.validation';

const router = Router();

// 1. getHomeContent (Storefront Public API)
router.route('/home').get(publicLimiter, HeroSectionController.getHomeContent);

// 2. Atomic Hero Banner Routes
// 2.1 Reorder banners (Must be before /banners/:bannerId)
router.route('/banners/reorder').patch(
  auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
  adminLimiter,
  burstProtection('admin', 10_000, 15),
  validateRequest(HeroSectionValidation.bannerReorderSchema),
  HeroSectionController.reorderHeroBanners,
);

// 2.2 Create banner & Get all banners
router
  .route('/banners')
  .post(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.single('image'),
    validateRequestFromFormData(HeroSectionValidation.bannerCreateSchema),
    HeroSectionController.createHeroBanner,
  )
  .get(publicLimiter, HeroSectionController.getAllHeroBanners);

// 2.3 Update banner status
router.route('/banners/:bannerId/status').patch(
  auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
  adminLimiter,
  validateRequest(HeroSectionValidation.bannerStatusSchema),
  HeroSectionController.updateHeroBannerStatus,
);

// 2.4 Get, update, delete single banner
router
  .route('/banners/:bannerId')
  .get(publicLimiter, HeroSectionController.getHeroBannerById)
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.single('image'),
    validateRequestFromFormData(HeroSectionValidation.bannerUpdateSchema),
    HeroSectionController.updateHeroBanner,
  )
  .delete(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    HeroSectionController.deleteHeroBanner,
  );

// 3. Legacy Routes (for backwards compatibility)
router
  .route('/heroes')
  .post(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.any(),
    validateRequestFromFormData(HeroSectionValidation.heroSectionCreateSchema),
    HeroSectionController.createHeroSection,
  )
  .get(publicLimiter, HeroSectionController.getAllHeroSections);

router
  .route('/heroes/:heroSectionId')
  .get(publicLimiter, HeroSectionController.getHeroSection)
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    burstProtection('admin', 10_000, 15),
    multerUpload.any(),
    validateRequestFromFormData(HeroSectionValidation.heroSectionUpdateSchema),
    HeroSectionController.updateHeroSection,
  )
  .delete(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    HeroSectionController.deleteHeroSection,
  );

export const HeroSectionRoutes = router;
