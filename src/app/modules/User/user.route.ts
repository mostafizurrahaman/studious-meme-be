import { Router } from 'express';
import {
  actionLimiter,
  adminLimiter,
  auth,
  authLimiter,
  burstProtection,
  duplicateSubmissionGuard,
  validateRequest,
} from '../../middlewares';
import { UserValidation } from './user.validation';
import { UserController } from './user.controller';
import { ROLE } from './user.constant';
import { multerUpload } from '../../lib';

const router = Router();

// 1. createUser
router
  .route('/signup')
  .post(
    authLimiter,
    burstProtection('auth', 10_000, 8),
    duplicateSubmissionGuard(),
    validateRequest(UserValidation.createUserSchema),
    UserController.createUser,
  );

// 2. sendSignupOtpAgain
router
  .route('/send-signup-otp-again')
  .post(
    authLimiter,
    burstProtection('auth', 10_000, 6),
    validateRequest(UserValidation.sendSignupOtpAgainSchema),
    UserController.sendSignupOtpAgain,
  );

// 3. verifySignupOtp
router
  .route('/verify-signup-otp')
  .post(
    authLimiter,
    burstProtection('auth', 10_000, 6),
    validateRequest(UserValidation.verifySignupOtpSchema),
    UserController.verifySignupOtp,
  );

// 4. signin
router
  .route('/signin')
  .post(
    authLimiter,
    burstProtection('auth', 10_000, 8),
    duplicateSubmissionGuard(),
    validateRequest(UserValidation.signinSchema),
    UserController.signin,
  );

// 5. updateProfilePhoto
router
  .route('/update-profile-photo')
  .put(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    burstProtection('action', 10_000, 15),
    multerUpload.single('user'),
    UserController.updateProfilePhoto,
  );

// 6. updateProfileData
router
  .route('/update-profile-data')
  .patch(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    burstProtection('action', 10_000, 15),
    validateRequest(UserValidation.updateProfileDataSchema),
    UserController.updateProfileData,
  );

// 7. changePassword
router
  .route('/change-password')
  .patch(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    actionLimiter,
    burstProtection('action', 10_000, 12),
    validateRequest(UserValidation.changePasswordSchema),
    UserController.changePassword,
  );

// 8. forgotPassword
router
  .route('/forgot-password')
  .post(
    authLimiter,
    burstProtection('auth', 10_000, 6),
    validateRequest(UserValidation.forgotPasswordSchema),
    UserController.forgotPassword,
  );

// 9. sendForgotPasswordOtpAgain
router
  .route('/send-forgot-password-otp-again')
  .post(
    authLimiter,
    burstProtection('auth', 10_000, 6),
    validateRequest(UserValidation.sendForgotPasswordOtpAgainSchema),
    UserController.sendForgotPasswordOtpAgain,
  );

// 10. verifyOtpForForgotPassword
router
  .route('/verify-forgot-password-otp')
  .post(
    authLimiter,
    burstProtection('auth', 10_000, 6),
    validateRequest(UserValidation.verifyOtpForForgotPasswordSchema),
    UserController.verifyOtpForForgotPassword,
  );

// 11. resetPassword
router
  .route('/reset-password')
  .post(
    authLimiter,
    burstProtection('auth', 10_000, 6),
    validateRequest(UserValidation.resetPasswordSchema),
    UserController.resetPassword,
  );

// 12. fetchProfile
router
  .route('/profile')
  .get(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN),
    UserController.fetchProfile,
  );

// 13. getNewAccessToken
router
  .route('/access-token')
  .get(authLimiter, UserController.getNewAccessToken);

// 14. deactivateUserAccount
router
  .route('/deactive-account')
  .patch(
    auth(ROLE.USER),
    actionLimiter,
    burstProtection('action', 10_000, 10),
    validateRequest(UserValidation.deactivateUserAccountSchema),
    UserController.deactivateUserAccount,
  );

// 15. deleteSpecificUserAccount
router
  .route('/delete-account')
  .delete(
    auth(ROLE.USER),
    actionLimiter,
    UserController.deleteSpecificUserAccount,
  );

// 16. adminGetAllUsers
router
  .route('/admin-get-all')
  .get(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    UserController.adminGetAllUsers,
  );

// 17. adminUpdateUserStatus
router
  .route('/admin-users/:userId/status')
  .patch(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    validateRequest(UserValidation.adminUpdateUserStatusSchema),
    UserController.adminUpdateUserStatus,
  );

// 18. adminDeleteUser
router
  .route('/admin-users/:userId')
  .delete(
    auth(ROLE.ADMIN, ROLE.SUPER_ADMIN),
    adminLimiter,
    UserController.adminDeleteUser,
  );

// 17. adminGetAllMetaData
// router
//   .route('/meta-data')
//   .get(auth(ROLE.ADMIN, ROLE.SUPER_ADMIN), UserController.adminGetAllMetaData);

// 18. getAllUser
// router.route('/users').get(UserController.getAllUser);

export const UserRoutes = router;
