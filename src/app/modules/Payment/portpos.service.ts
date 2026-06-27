import crypto from 'crypto';
import httpStatus from 'http-status';
import { fetch } from 'undici';
import config from '../../config';
import { AppError } from '../../utils';
import type { IUser } from '../User/user.interface';

type PortPosOrderCustomer = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  note?: string;
};

type PortPosOrderItem = {
  title: string;
  sku: string;
  quantity: number;
  lineTotal: number;
};

type PortPosOrder = {
  orderId: string;
  customer: PortPosOrderCustomer;
  items: PortPosOrderItem[];
  payableAmount?: number;
  totalAmount?: number;
  currency?: string;
  total?: number;
};

type PortPosInvoiceResponse = {
  result?: boolean | string;
  message?: string;
  data?: {
    invoice_id?: string;
    reference?: string;
    action?: {
      url?: string;
      method?: string;
      payload?: unknown;
    };
    order?: {
      amount?: number | string;
      currency?: string;
      status?: string;
      redirect_url?: string;
      created_at?: string;
    };
    billing?: Record<string, unknown>;
    product?: Record<string, unknown>;
    shipping?: Record<string, unknown>;
    customs?: Array<{ name?: string; value?: string }>;
  };
  error?: string;
  errors?: string[];
};

type PortPosInvoiceDetailsResponse = {
  result?: boolean | string;
  message?: string;
  data?: {
    invoice_id?: string;
    reference?: string;
    order?: {
      amount?: number | string;
      currency?: string;
      status?: string;
      redirect_url?: string;
      created_at?: string;
      discount_availed?: number | string;
    };
    billing?: {
      gateway?: {
        status?: string;
        approve_code?: string;
        reason?: string;
      };
      payer?: Record<string, unknown>;
      customer?: Record<string, unknown>;
      source?: Record<string, unknown>;
    };
    product?: Record<string, unknown>;
    shipping?: Record<string, unknown>;
    transactions?: unknown[];
    customs?: Array<{ name?: string; value?: string }>;
  };
  error?: string;
  errors?: string[];
};

type PortPosRefundResponse = {
  result?: boolean | string;
  message?: string;
  data?: {
    order?: {
      invoice?: string;
      amount?: number | string;
      currency?: string;
      status?: string;
    };
    refund?: {
      amount?: number | string;
      currency?: string;
      status?: string;
    };
  };
  error?: string;
  errors?: string[];
};

type PortPosAuth = {
  authorization: string;
};

const ensureConfig = () => {
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

const buildAuthHeader = (): PortPosAuth => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const token = crypto
    .createHash('md5')
    .update(`${String(config.portpos.secret_key)}${timestamp}`)
    .digest('hex');
  const authorization = Buffer.from(
    `${String(config.portpos.app_key)}:${token}`,
  ).toString('base64');

  return {
    authorization: `Bearer ${authorization}`,
  };
};

const buildBaseUrl = () => String(config.portpos.base_url).replace(/\/$/, '');

const buildPaymentUrl = (path: string) => {
  const baseUrl = buildBaseUrl();
  return new URL(path.replace(/^\//, ''), `${baseUrl}/`).toString();
};

const buildRequestUrl = (pathOrUrl: string) => {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return buildPaymentUrl(pathOrUrl);
};

const buildFrontendUrl = (path: string) =>
  `${String(config.urls.frontend_app).replace(/\/$/, '')}${path}`;

const appendOrderQuery = (inputUrl: string, orderId: string, kind: string) => {
  try {
    const url = /^https?:\/\//i.test(inputUrl)
      ? new URL(inputUrl)
      : new URL(inputUrl, buildFrontendUrl('/'));

    url.searchParams.set('orderId', orderId);
    url.searchParams.set('payment', kind);
    return url.toString();
  } catch {
    const separator = inputUrl.includes('?') ? '&' : '?';
    return `${inputUrl}${separator}orderId=${encodeURIComponent(orderId)}&payment=${encodeURIComponent(kind)}`;
  }
};

const buildBackendUrl = (path: string) =>
  `${String(config.urls.backend_public).replace(/\/$/, '')}${path}`;

const extractGatewayMessage = (
  payload:
    | PortPosInvoiceResponse
    | PortPosInvoiceDetailsResponse
    | PortPosRefundResponse,
) => {
  if (payload.message) {
    return payload.message;
  }

  if (typeof payload.result === 'string') {
    return payload.result;
  }

  if (payload.error) {
    return payload.error;
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.join(', ');
  }

  return 'PortPOS request failed.';
};

type PortPosRequestInit = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: string;
};

const requestPortPos = async <T>(
  path: string,
  init: PortPosRequestInit,
): Promise<T> => {
  ensureConfig();

  const headers = {
    authorization: buildAuthHeader().authorization,
    'content-type': 'application/json',
  };

  const response = await fetch(buildRequestUrl(path), {
    ...init,
    headers,
  });

  const rawBody = await response.text().catch(() => '');
  const payload = (() => {
    try {
      return (rawBody ? JSON.parse(rawBody) : {}) as T & {
        message?: string;
        error?: string;
        errors?: string[];
        result?: boolean | string;
      };
    } catch {
      return {} as T & {
        message?: string;
        error?: string;
        errors?: string[];
        result?: boolean | string;
      };
    }
  })();

  const requestFailed =
    !response.ok ||
    (payload &&
      typeof payload === 'object' &&
      'result' in payload &&
      payload.result === false);

  if (requestFailed) {
    const gatewayMessage = extractGatewayMessage(
      payload as
        | PortPosInvoiceResponse
        | PortPosInvoiceDetailsResponse
        | PortPosRefundResponse,
    );

    throw new AppError(
      httpStatus.BAD_GATEWAY,
      `PortPOS ${response.status} ${response.statusText || 'request failed'}: ${gatewayMessage}${rawBody ? ` | ${rawBody}` : ''}`,
    );
  }

  return payload;
};

const getRedirectUrl = (
  orderId: string,
  kind: 'success' | 'fail' | 'cancel',
) => {
  if (kind === 'success' && config.portpos.redirect_success_url) {
    return appendOrderQuery(config.portpos.redirect_success_url, orderId, kind);
  }

  if (kind === 'fail' && config.portpos.redirect_fail_url) {
    return appendOrderQuery(config.portpos.redirect_fail_url, orderId, kind);
  }

  if (kind === 'cancel' && config.portpos.redirect_cancel_url) {
    return appendOrderQuery(config.portpos.redirect_cancel_url, orderId, kind);
  }

  return buildFrontendUrl(`/payment/${kind}?orderId=${encodeURIComponent(orderId)}&payment=${kind}`);
};

const buildCustomerAddress = (order: PortPosOrder) => ({
  street: order.customer.address,
  city: order.customer.city,
  state: order.customer.city,
  zipcode: order.customer.phone.replace(/\D/g, '').slice(-4) || '0000',
  country: 'BD',
});

const createInvoice = async (order: PortPosOrder, user: IUser) => {
  ensureConfig();

  const redirectUrl = getRedirectUrl(order.orderId, 'success');
  const payload = {
    order: {
      amount: Number(order.payableAmount ?? order.totalAmount ?? order.total ?? 0),
      currency: order.currency ?? 'BDT',
      redirect_url: redirectUrl,
      ipn_url:
        config.portpos.ipn_url ??
        buildBackendUrl('/api/v1/payment/portpos/ipn'),
      reference: order.orderId,
      validity: 60,
    },
    product: {
      name: order.items[0]?.title ?? `Order ${order.orderId}`,
      description: order.items
        .map((item) => `${item.title} x ${item.quantity}`)
        .join(', '),
    },
    billing: {
      customer: {
        name: order.customer.name,
        email: order.customer.email || user.email,
        phone: order.customer.phone,
        address: buildCustomerAddress(order),
      },
    },
    customs: [
      { orderId: order.orderId },
      { userId: String(user._id) },
      { successUrl: getRedirectUrl(order.orderId, 'success') },
      { failUrl: getRedirectUrl(order.orderId, 'fail') },
      { cancelUrl: getRedirectUrl(order.orderId, 'cancel') },
    ],
  };

  const response = await requestPortPos<PortPosInvoiceResponse>(
    config.portpos.payment_url ?? '/invoice',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  const invoiceId = response.data?.invoice_id;
  const paymentUrl =
    response.data?.action?.url ?? response.data?.order?.redirect_url;

  if (!invoiceId || !paymentUrl) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      'PortPOS did not return a payment URL.',
    );
  }

  return {
    invoiceId,
    paymentUrl,
    reference: response.data?.reference ?? order.orderId,
    rawResponse: response,
    redirectUrls: {
      success: getRedirectUrl(order.orderId, 'success'),
      fail: getRedirectUrl(order.orderId, 'fail'),
      cancel: getRedirectUrl(order.orderId, 'cancel'),
    },
  };
};

const verifyInvoice = async (invoiceId: string) => {
  if (!invoiceId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invoice ID is required.');
  }

  return requestPortPos<PortPosInvoiceDetailsResponse>(
    `/invoice/${encodeURIComponent(invoiceId)}`,
    {
      method: 'GET',
    },
  );
};

const validateIpn = async (invoiceId: string, amount: number) => {
  if (!invoiceId || !Number.isFinite(amount) || amount <= 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Valid invoice id and amount are required for IPN validation.',
    );
  }

  return requestPortPos<PortPosInvoiceDetailsResponse>(
    `/invoice/ipn/${encodeURIComponent(invoiceId)}/${amount}`,
    {
      method: 'GET',
    },
  );
};

const refundPayment = async (invoiceId: string, amount: number) => {
  if (!invoiceId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Invoice ID is required for refunds.',
    );
  }

  return requestPortPos<PortPosRefundResponse>(
    `/invoice/refund/${encodeURIComponent(invoiceId)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        refund: {
          amount,
          currency: 'BDT',
        },
      }),
    },
  );
};

export const PortPosService = {
  createInvoice,
  verifyInvoice,
  validateIpn,
  refundPayment,
  getRedirectUrl,
};
