import httpStatus from 'http-status';
import { sendResponse, asyncHandler } from '../../utils';
import { DashboardService } from './dashboard.service';

const getDashboardOverview = asyncHandler(async (req, res) => {
  const result = await DashboardService.getDashboardOverviewFromDB(
    req.user.role,
    req.user._id?.toString()
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Dashboard overview retrieved successfully!',
    data: result,
  });
});

export const DashboardController = {
  getDashboardOverview,
};
