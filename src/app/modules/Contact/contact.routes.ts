import { Router } from 'express';
import {
  adminLimiter,
  auth,
  authLimiter,
  burstProtection,
  duplicateSubmissionGuard,
  validateRequest,
} from '../../middlewares';
import { ROLE } from '../User/user.constant';
import { ContactValidation } from './contact.validation';
import { ContactController } from './contact.controller';

const router = Router();

// 1. adminGetAllContacts
router
  .route('/')
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    ContactController.adminGetAllContacts,
  );

// 2. createContact
router.route('/').post(
  // auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
  authLimiter,
  burstProtection('auth', 10_000, 6),
  duplicateSubmissionGuard(),
  validateRequest(ContactValidation.createContactValidation),
  ContactController.createContact,
);

export const ContactRoutes = router;
