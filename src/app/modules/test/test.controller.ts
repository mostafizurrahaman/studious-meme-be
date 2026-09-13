import { asyncHandler, sendResponse } from '../../utils';
import { sendSms } from '../../utils/send-sms';
import { testServices } from './test.services';
import httpStatus from 'http-status';

const sendTestEmail = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  
  const smsResult = await sendSms(phone, otp)



  const result = await testServices.sendTestEmail(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: `Email send successfully.`,
    data: {result, smsResult},
  });
});

export const testControllers = {
  sendTestEmail,
};
