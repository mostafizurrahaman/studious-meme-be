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
import { HeroSectionController } from './heroSection.controller';
import { HeroSectionValidation } from './heroSection.validation';

const router = Router();

// 1. getHomeContent
router.route('/home').get(publicLimiter, HeroSectionController.getHomeContent);

// 2. createHeroSection, getAllHeroSections
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

// 3. getHeroSection, updateHeroSection, deleteHeroSection
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
