import { Router } from 'express';
import { actionLimiter, auth } from '../../middlewares';
import { ROLE } from '../User/user.constant';
import { DashboardController } from './dashboard.controller';

const router = Router();

router
  .route('/overview')
  .get(
    auth(ROLE.USER, ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.MODERATOR),
    actionLimiter,
    DashboardController.getDashboardOverview
  );

export const DashboardRoutes = router;
