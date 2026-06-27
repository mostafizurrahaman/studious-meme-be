import httpStatus from 'http-status';
import { asyncHandler, sendResponse } from '../../utils';
import { ROLE } from '../User/user.constant';
import { PaymentService } from '../Payment/payment.service';
import { OrderService } from './order.service';

const getSingleParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

// 1. previewCheckout
const previewCheckout = asyncHandler(async (req, res) => {
  const result = await OrderService.previewCheckoutFromDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Checkout preview generated successfully!',
    data: result,
  });
});

// 2. createOrder
const createOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.createOrderIntoDB(req.user, req.body);

  if (req.body.paymentMethod === 'PORTPOS') {
    const payment = await PaymentService.initiatePortPosPayment(
      req.user,
      order.orderId,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: 'Payment initiated successfully!',
      data: {
        orderId: order.orderId,
        invoiceId: payment.invoiceId,
        paymentUrl: payment.paymentUrl,
        transactionId: payment.transactionId,
      },
    });

    return;
  }

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Order created successfully!',
    data: order,
  });
});

// 3. getMyOrders
const getMyOrders = asyncHandler(async (req, res) => {
  const result = await OrderService.getMyOrdersFromDB(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Orders fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

// 4. getMySingleOrder
const getMySingleOrder = asyncHandler(async (req, res) => {
  const result = await OrderService.getSingleOrderForUserFromDB(
    req.user,
    getSingleParam(req.params.orderId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Order fetched successfully!',
    data: result,
  });
});

// 5. getSingleOrder
const getSingleOrder = asyncHandler(async (req, res) => {
  const orderId = getSingleParam(req.params.orderId);

  const result =
    req.user.role === ROLE.ADMIN || req.user.role === ROLE.SUPER_ADMIN
      ? await OrderService.getOrderByIdFromDB(orderId)
      : await OrderService.getSingleOrderForUserFromDB(req.user, orderId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Order fetched successfully!',
    data: result,
  });
});

// 6. getAllOrdersForAdmin
const getAllOrdersForAdmin = asyncHandler(async (req, res) => {
  const result = await OrderService.getAllOrdersForAdminFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Orders fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

// 7. updateOrderStatus
const updateOrderStatus = asyncHandler(async (req, res) => {
  const result = await OrderService.updateOrderStatusIntoDB(
    getSingleParam(req.params.orderId),
    req.body.status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Order status updated successfully!',
    data: result,
  });
});

export const OrderController = {
  previewCheckout,
  createOrder,
  getMyOrders,
  getMySingleOrder,
  getSingleOrder,
  getAllOrdersForAdmin,
  updateOrderStatus,
};
