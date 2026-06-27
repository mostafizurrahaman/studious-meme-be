import httpStatus from 'http-status';
import { asyncHandler, sendResponse } from '../../utils';
import { PaymentService } from './payment.service';

const getSingleParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

// 1. initiatePortPosPayment
const initiatePortPosPayment = asyncHandler(async (req, res) => {
  const result = await PaymentService.initiatePortPosPayment(
    req.user,
    getSingleParam(req.params.orderId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Payment initiated successfully!',
    data: result,
  });
});

// 2. portPosIpn
const portPosIpn = asyncHandler(async (req, res) => {
  const result = await PaymentService.handlePortPosIpn({
    ...req.query,
    ...req.body,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'IPN processed successfully!',
    data: result,
  });
});

// 3. verifyPortPosPayment
const verifyPortPosPayment = asyncHandler(async (req, res) => {
  const result = await PaymentService.verifyPortPosPayment(
    req.user,
    getSingleParam(req.params.orderId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Payment status verified successfully!',
    data: result,
  });
});

// 4. refundPortPosPayment
const refundPortPosPayment = asyncHandler(async (req, res) => {
  const result = await PaymentService.refundPayment(
    getSingleParam(req.params.orderId),
    req.body.amount,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Payment refunded successfully!',
    data: result,
  });
});

// 5. getMyPayments
const getMyPayments = asyncHandler(async (req, res) => {
  const result = await PaymentService.getMyPaymentsFromDB(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Payments retrieved successfully!',
    data: result.data,
    meta: result.meta,
  });
});

// 6. getAllPaymentsForAdmin
const getAllPaymentsForAdmin = asyncHandler(async (req, res) => {
  const result = await PaymentService.getAllPaymentsForAdminFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Payments retrieved successfully!',
    data: result.data,
    meta: result.meta,
    summary: result.summary,
  });
});

export const PaymentController = {
  initiatePortPosPayment,
  portPosIpn,
  verifyPortPosPayment,
  refundPortPosPayment,
  getMyPayments,
  getAllPaymentsForAdmin,
};
