import { asyncHandler, sendResponse } from '../../utils';
import { testServices } from './test.services';
import httpStatus from 'http-status';

const sendTestEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result = await testServices.sendTestEmail(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: `Email send successfully.`,
    data: result,
  });
});

export const testControllers = {
  sendTestEmail,
};
