import { Router } from 'express';
import {
  actionLimiter,
  auth,
  burstProtection,
  duplicateSubmissionGuard,
  validateRequest,
} from '../../middlewares';
import { ROLE } from '../User/user.constant';
import { AddressController } from './address.controllers';
import { AddressValidation } from './address.validations';

const router = Router();

// Create Address & Get My Addresses
router
  .route('/')
  .post(
    auth(),
    actionLimiter,
    burstProtection('action', 10_000, 12),
    duplicateSubmissionGuard(),
    validateRequest(AddressValidation.createAddressSchema),
    AddressController.createAddress,
  )
  .get(auth(), actionLimiter, AddressController.getMyAddresses);

// Update Address & Delete Address
router
  .route('/:addressId')
  .patch(
    auth(),
    actionLimiter,
    burstProtection('action', 10_000, 12),
    validateRequest(AddressValidation.updateAddressSchema),
    AddressController.updateAddress,
  )
  .delete(
    auth(),
    actionLimiter,
    burstProtection('action', 10_000, 12),
    validateRequest(AddressValidation.addressIdParamsSchema),
    AddressController.deleteAddress,
  );

// Set Default Address
router
  .route('/:addressId/default')
  .patch(
    auth(),
    actionLimiter,
    burstProtection('action', 10_000, 12),
    validateRequest(AddressValidation.addressIdParamsSchema),
    AddressController.setDefaultAddress,
  );

export const AddressRoutes = router;
