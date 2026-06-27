import httpStatus from 'http-status';
import { AppError } from '../../utils';
import config from '../../config';
import { IUser } from '../User/user.interface';
import UserModel from '../User/user.model';
import { Payment } from './payment.model';
import { OrderModel } from '../Order/order.model';
import { OrderService } from '../Order/order.service';
import { PortPosService } from './portpos.service';
import { sendOrderConfirmationEmail } from '../../utils';

type PortPosInitiationResult = {
  orderId: string;
  invoiceId: string;
  paymentUrl: string;
  transactionId: string;
};

type GatewayPayload = Record<string, unknown>;

type PaymentRecordLike = {
  _id: unknown;
  invoiceId?: string;
  transactionId: string;
  gatewayUrl?: string;
  paymentUrl?: string;
  status: string;
};

type PortPosOrderLean = {
  _id: unknown;
  orderId: string;
  user: unknown;
  items: Array<{
    title: string;
    sku: string;
    quantity: number;
    lineTotal: number;
  }>;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    note?: string;
  };
  subtotal: number;
  discount: number;
  delivery: number;
  shippingZone: string;
  shippingCharge: number;
  totalWeightKg: number;
  codEligible: boolean;
  codReasons: string[];
  total: number;
  totalAmount?: number;
  payableAmount?: number;
  currency?: string;
  paymentMethod: string;
  paymentGateway?: string;
  paymentStatus: string;
  status?: string;
  paymentId?: unknown;
  invoiceId?: string;
  transactionId?: string;
  gatewayUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const resolveOrderNotificationEmail = async (order: PortPosOrderLean) => {
  const customerEmail =
    typeof order.customer.email === 'string' ? order.customer.email.trim() : '';

  if (customerEmail) {
    return customerEmail;
  }

  const userId =
    typeof order.user === 'string' ? order.user : String(order.user);
  const user = await UserModel.findById(userId).select('email').lean();

  return typeof user?.email === 'string' ? user.email.trim() : '';
};

const requirePortPosConfig = () => {
  if (!config.portpos.app_key || !config.portpos.secret_key) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'PortPOS credentials are not configured.',
    );
  }

  if (!config.urls.backend_public || !config.urls.frontend_app) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Public app URLs are not configured.',
    );
  }
};

const normalizeAmount = (value: number | string | undefined) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const isSuccessStatus = (status: string) =>
  ['PAID', 'SUCCESS', 'VALID', 'VALIDATED', 'COMPLETED'].includes(status);

const isFailureStatus = (status: string) =>
  ['FAILED', 'FAIL', 'CANCELLED', 'CANCELED', 'VOID', 'EXPIRED'].includes(
    status,
  );

const getInvoiceIdFromPayload = (payload: GatewayPayload) => {
  const candidate =
    payload.invoice_id ??
    payload.invoice ??
    payload.invoiceId ??
    payload.reference;
  return typeof candidate === 'string' ? candidate : '';
};

const getAmountFromPayload = (payload: GatewayPayload) => {
  const candidate =
    payload.amount ??
    (payload.order as { amount?: unknown } | undefined)?.amount;
  return normalizeAmount(candidate as number | string | undefined);
};

const getStatusFromPayload = (payload: GatewayPayload) => {
  const candidate =
    payload.status ??
    (payload.billing as { gateway?: { status?: unknown } } | undefined)?.gateway
      ?.status;
  return typeof candidate === 'string' ? candidate.toUpperCase() : '';
};

const getReferenceFromPayload = (payload: GatewayPayload) => {
  const candidate =
    payload.reference ??
    (payload.order as { reference?: unknown } | undefined)?.reference;
  return typeof candidate === 'string' ? candidate : '';
};

const buildPaymentRecordPayload = (
  order: PortPosOrderLean,
  transactionId: string,
) => ({
  user: order.user,
  order: order._id,
  amount: normalizeAmount(
    order.payableAmount ?? order.totalAmount ?? order.total,
  ),
  currency: order.currency ?? 'BDT',
  status: 'INITIATED' as const,
  gateway: 'PORTPOS' as const,
  transactionId,
  gatewayUrl: order.gatewayUrl,
  paymentUrl: order.gatewayUrl,
});

// 1. initiatePortPosPayment
const initiatePortPosPayment = async (
  user: IUser,
  orderId: string,
): Promise<PortPosInitiationResult> => {
  requirePortPosConfig();

  const order = (await OrderModel.findOne({
    orderId,
    user: user._id,
  }).lean()) as PortPosOrderLean | null;

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found!');
  }

  if (order.paymentMethod !== 'PORTPOS') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This order is not configured for PortPOS payment.',
    );
  }

  if (order.paymentStatus === 'PAID') {
    throw new AppError(httpStatus.BAD_REQUEST, 'This order is already paid.');
  }

  const existingPayment = await Payment.findOne({ order: String(order._id) })
    .sort({ createdAt: -1 })
    .lean();
  if (
    existingPayment &&
    existingPayment.invoiceId &&
    ['INITIATED', 'PAID'].includes(existingPayment.status)
  ) {
    return {
      orderId,
      invoiceId: existingPayment.invoiceId,
      paymentUrl:
        existingPayment.paymentUrl || existingPayment.gatewayUrl || '',
      transactionId: existingPayment.transactionId,
    };
  }

  const transactionId =
    order.transactionId ?? `PORTPOS-${order.orderId}-${Date.now()}`;

  const paymentRecord = await Payment.findOneAndUpdate(
    { transactionId },
    buildPaymentRecordPayload(order, transactionId),
    { upsert: true, returnDocument: 'after', runValidators: true },
  );

  let createdInvoice;

  try {
    createdInvoice = await PortPosService.createInvoice(
      {
        ...order,
        payableAmount: normalizeAmount(
          order.payableAmount ?? order.totalAmount ?? order.total,
        ),
        currency: order.currency ?? 'BDT',
      },
      user,
    );
  } catch (error) {
    await Payment.findByIdAndUpdate(paymentRecord?._id, {
      status: 'FAILED',
      failedAt: new Date(),
      gatewayPayload:
        error instanceof Error ? { message: error.message } : undefined,
    });

    throw error;
  }

  const updatedPayment = await Payment.findOneAndUpdate(
    { _id: paymentRecord?._id },
    {
      invoiceId: createdInvoice.invoiceId,
      paymentUrl: createdInvoice.paymentUrl,
      gatewayUrl: createdInvoice.paymentUrl,
      rawInitResponse: createdInvoice.rawResponse as Record<string, unknown>,
      gatewayPayload: createdInvoice.rawResponse as Record<string, unknown>,
    },
    { returnDocument: 'after', runValidators: true },
  );

  const paymentIdentifier = updatedPayment?._id ?? paymentRecord?._id;

  await OrderService.updateOrderPaymentIntoDB(order.orderId, {
    ...(paymentIdentifier ? { paymentId: String(paymentIdentifier) } : {}),
    invoiceId: createdInvoice.invoiceId,
    paymentGateway: 'PORTPOS',
    paymentStatus: 'UNPAID',
    transactionId,
    gatewayUrl: createdInvoice.paymentUrl,
    status: 'PENDING_PAYMENT',
    payableAmount: normalizeAmount(
      order.payableAmount ?? order.totalAmount ?? order.total,
    ),
    totalAmount: normalizeAmount(
      order.payableAmount ?? order.totalAmount ?? order.total,
    ),
    currency: order.currency ?? 'BDT',
  });

  return {
    orderId,
    invoiceId: createdInvoice.invoiceId,
    paymentUrl: createdInvoice.paymentUrl,
    transactionId,
  };
};

// helper: finalizePaymentFromGateway
const finalizePaymentFromGateway = async (
  order: PortPosOrderLean,
  payment: PaymentRecordLike | null,
  payload: GatewayPayload,
  verifiedResponse: Record<string, unknown>,
  finalStatus: 'PAID' | 'FAILED' | 'CANCELLED',
) => {
  const status = finalStatus === 'PAID' ? 'PAID' : finalStatus;
  const orderStatus = finalStatus === 'PAID' ? 'CONFIRMED' : 'CANCELLED';
  const shouldSendConfirmationEmail =
    finalStatus === 'PAID' &&
    !(order.paymentStatus === 'PAID' && order.status === 'CONFIRMED');

  if (payment) {
    await Payment.findByIdAndUpdate(payment._id, {
      status,
      rawIpnPayload: payload,
      rawVerifyResponse: verifiedResponse,
      gatewayPayload: verifiedResponse,
      paidAt: finalStatus === 'PAID' ? new Date() : undefined,
      failedAt: finalStatus === 'PAID' ? undefined : new Date(),
      invoiceId: getInvoiceIdFromPayload(payload) || payment.invoiceId,
      gatewayUrl: payment.gatewayUrl,
    });
  }

  await OrderService.updateOrderPaymentIntoDB(order.orderId, {
    paymentStatus: finalStatus,
    status: orderStatus,
    paymentGateway: 'PORTPOS',
    invoiceId:
      getInvoiceIdFromPayload(payload) || payment?.invoiceId || order.invoiceId,
    ...(payment?._id || order.paymentId
      ? { paymentId: String(payment?._id ?? order.paymentId) }
      : {}),
    transactionId: payment?.transactionId || order.transactionId || '',
  });

  if (shouldSendConfirmationEmail) {
    const recipientEmail = await resolveOrderNotificationEmail(order);

    if (recipientEmail) {
      await sendOrderConfirmationEmail({
        email: recipientEmail,
        customerName: order.customer.name,
        orderId: order.orderId,
        paymentMethod: 'PORTPOS',
        confirmationKind: 'payment',
        items: order.items.map((item) => ({
          title: item.title,
          sku: item.sku,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
        subtotal: order.subtotal,
        discount: order.discount,
        delivery: order.delivery,
        total: order.total,
        city: order.customer.city,
        address: order.customer.address,
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.error(
          'Failed to send PortPOS order confirmation email:',
          error,
        );
      });
    }
  }

  return {
    orderId: order.orderId,
    invoiceId:
      getInvoiceIdFromPayload(payload) ||
      payment?.invoiceId ||
      order.invoiceId ||
      '',
    paymentStatus: finalStatus,
    orderStatus,
  };
};

// 3. handlePortPosIpn
const handlePortPosIpn = async (payload: GatewayPayload) => {
  requirePortPosConfig();

  const invoiceId = getInvoiceIdFromPayload(payload);
  const amount = getAmountFromPayload(payload);
  const reference = getReferenceFromPayload(payload);

  if (!invoiceId || !amount) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid PortPOS IPN payload.');
  }

  const verifiedResponse = await PortPosService.validateIpn(invoiceId, amount);
  const verifiedData = verifiedResponse.data;
  const verifiedOrderAmount = normalizeAmount(verifiedData?.order?.amount);
  const verifiedCurrency = String(
    verifiedData?.order?.currency ?? '',
  ).toUpperCase();
  const verifiedStatus = getStatusFromPayload({
    ...payload,
    status: verifiedData?.order?.status ?? payload.status,
  });
  const orderId = reference || String(verifiedData?.reference ?? '');

  if (!orderId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'PortPOS IPN did not include an order reference.',
    );
  }

  const order = (await OrderModel.findOne({
    orderId,
  }).lean()) as PortPosOrderLean | null;
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found!');
  }

  let payment = (await Payment.findOne({
    $or: [
      { invoiceId },
      { transactionId: order.transactionId },
      { order: String(order._id) },
    ],
  }).sort({ createdAt: -1 })) as PaymentRecordLike | null;

  if (!payment) {
    payment = (await Payment.findOneAndUpdate(
      { invoiceId },
      {
        user: order.user,
        order: order._id,
        amount,
        currency: 'BDT',
        status: 'INITIATED',
        gateway: 'PORTPOS',
        transactionId: order.transactionId || `PORTPOS-${order.orderId}`,
        invoiceId,
        rawIpnPayload: payload,
        rawVerifyResponse: verifiedResponse,
        gatewayPayload: verifiedResponse,
      },
      { upsert: true, returnDocument: 'after', runValidators: true },
    )) as PaymentRecordLike | null;
  }

  if (payment?.status === 'PAID' || order.paymentStatus === 'PAID') {
    return {
      orderId: order.orderId,
      invoiceId: payment?.invoiceId || invoiceId,
      paymentStatus: 'PAID' as const,
      orderStatus: order.status || 'CONFIRMED',
    };
  }

  if (verifiedCurrency && verifiedCurrency !== 'BDT') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'PortPOS currency mismatch detected.',
    );
  }

  if (verifiedOrderAmount && verifiedOrderAmount !== amount) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'PortPOS amount mismatch detected.',
    );
  }

  if (
    verifiedStatus &&
    !isSuccessStatus(verifiedStatus) &&
    !isFailureStatus(verifiedStatus)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'PortPOS payment status is not valid.',
    );
  }

  if (isSuccessStatus(verifiedStatus)) {
    return finalizePaymentFromGateway(
      order,
      payment,
      payload,
      verifiedResponse as Record<string, unknown>,
      'PAID',
    );
  }

  return finalizePaymentFromGateway(
    order,
    payment,
    payload,
    verifiedResponse as Record<string, unknown>,
    isFailureStatus(verifiedStatus) ? 'FAILED' : 'CANCELLED',
  );
};

// 4. verifyPortPosPayment
const verifyPortPosPayment = async (user: IUser, orderId: string) => {
  requirePortPosConfig();

  const order = (await OrderModel.findOne({
    orderId,
    user: user._id,
  }).lean()) as PortPosOrderLean | null;

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found!');
  }

  let payment = (await Payment.findOne({
    $or: [{ invoiceId: order.invoiceId }, { order: String(order._id) }],
  }).sort({ createdAt: -1 })) as PaymentRecordLike | null;

  if (!payment?.invoiceId && !order.invoiceId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'PortPOS invoice not found for this order.',
    );
  }

  const invoiceId = payment?.invoiceId || order.invoiceId || '';
  const verifiedResponse = await PortPosService.verifyInvoice(invoiceId);
  const verifiedData = verifiedResponse.data;
  const verifiedAmount = normalizeAmount(verifiedData?.order?.amount);
  const verifiedCurrency = String(
    verifiedData?.order?.currency ?? '',
  ).toUpperCase();
  const verifiedStatus = String(
    verifiedData?.order?.status ?? verifiedData?.billing?.gateway?.status ?? '',
  ).toUpperCase();
  const verifiedReference = String(verifiedData?.reference ?? '');

  if (!payment && invoiceId) {
    payment = (await Payment.findOneAndUpdate(
      { invoiceId },
      {
        user: order.user,
        order: order._id,
        amount: normalizeAmount(
          order.payableAmount ?? order.totalAmount ?? order.total,
        ),
        currency: order.currency ?? 'BDT',
        status: 'INITIATED',
        gateway: 'PORTPOS',
        transactionId: order.transactionId || `PORTPOS-${order.orderId}`,
        invoiceId,
        rawVerifyResponse: verifiedResponse,
        gatewayPayload: verifiedResponse,
      },
      { upsert: true, returnDocument: 'after', runValidators: true },
    )) as PaymentRecordLike | null;
  }

  if (verifiedReference && verifiedReference !== order.orderId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'PortPOS order reference mismatch detected.',
    );
  }

  if (verifiedCurrency && verifiedCurrency !== 'BDT') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'PortPOS currency mismatch detected.',
    );
  }

  if (
    verifiedAmount &&
    verifiedAmount !==
      normalizeAmount(order.payableAmount ?? order.totalAmount ?? order.total)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'PortPOS amount mismatch detected.',
    );
  }

  if (isSuccessStatus(verifiedStatus)) {
    await finalizePaymentFromGateway(
      order,
      payment,
      {
        invoice_id: invoiceId,
        reference: order.orderId,
        amount: verifiedAmount,
        status: verifiedStatus,
      },
      verifiedResponse as Record<string, unknown>,
      'PAID',
    );
  } else if (isFailureStatus(verifiedStatus)) {
    await finalizePaymentFromGateway(
      order,
      payment,
      {
        invoice_id: invoiceId,
        reference: order.orderId,
        amount: verifiedAmount,
        status: verifiedStatus,
      },
      verifiedResponse as Record<string, unknown>,
      'FAILED',
    );
  }

  const freshOrder = await OrderModel.findOne({
    orderId,
    user: user._id,
  }).lean();

  return {
    orderId: order.orderId,
    invoiceId,
    paymentStatus: freshOrder?.paymentStatus ?? order.paymentStatus,
    orderStatus: freshOrder?.status ?? order.status,
    verifiedStatus,
  };
};

// 5. refundPayment
const refundPayment = async (orderId: string, amount?: number) => {
  requirePortPosConfig();

  const order = (await OrderModel.findOne({
    orderId,
  }).lean()) as PortPosOrderLean | null;
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found!');
  }

  const payment = (await Payment.findOne({
    $or: [{ invoiceId: order.invoiceId }, { order: String(order._id) }],
  }).sort({ createdAt: -1 })) as PaymentRecordLike | null;
  if (!payment?.invoiceId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'PortPOS invoice not found for this order.',
    );
  }

  const refundResponse = await PortPosService.refundPayment(
    payment.invoiceId,
    amount ||
      normalizeAmount(order.payableAmount ?? order.totalAmount ?? order.total),
  );

  await Payment.findByIdAndUpdate(payment._id, {
    status: 'REFUNDED',
    rawVerifyResponse: refundResponse as Record<string, unknown>,
    gatewayPayload: refundResponse as Record<string, unknown>,
  });

  await OrderService.updateOrderPaymentIntoDB(order.orderId, {
    paymentStatus: 'REFUNDED',
    status: 'CANCELLED',
  });

  return refundResponse;
};

// 6. getMyPaymentsFromDB
const getMyPaymentsFromDB = async (
  user: IUser,
  query: Record<string, unknown> = {},
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 50;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Payment.find({ user: user._id })
      .populate(
        'order',
        'orderId total totalAmount payableAmount status paymentStatus paymentGateway invoiceId transactionId',
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments({ user: user._id }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

// 7. getAllPaymentsForAdminFromDB
const getAllPaymentsForAdminFromDB = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 50;
  const skip = (page - 1) * limit;

  const [data, total, summary] = await Promise.all([
    Payment.find({})
      .populate('user', 'name email phone role')
      .populate(
        'order',
        'orderId total totalAmount payableAmount status paymentStatus paymentGateway invoiceId transactionId',
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(),
    Payment.aggregate([
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    summary: {
      totalAmount: summary[0]?.totalAmount || 0,
    },
  };
};

export const PaymentService = {
  initiatePortPosPayment,
  handlePortPosIpn,
  verifyPortPosPayment,
  refundPayment,
  getMyPaymentsFromDB,
  getAllPaymentsForAdminFromDB,
};
