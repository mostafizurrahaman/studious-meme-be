import httpStatus from 'http-status';
import { AppError, sendOrderConfirmationEmail } from '../../utils';
import { IUser } from '../User/user.interface';
import { ProductModel } from '../Product/product.model';
import { OrderModel } from './order.model';
import {
  IOrderItemSnapshot,
  TOrderStatus,
  TPaymentGateway,
  TPaymentMethodInput,
  TPaymentStatus,
} from './order.interface';
import { normalizePaymentMethod } from './order.utils';
import { CouponService } from '../Coupon/coupon.service';
import {
  DEFAULT_SELLING_UNIT,
  normalizeSellingUnit,
} from '../Product/selling-unit';

type CreateOrderPayload = {
  items: Array<{ sku: string; quantity: number }>;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    note?: string;
  };
  couponCode?: string;
  paymentMethod: TPaymentMethodInput;
};

type ProductForCheckout = {
  _id: unknown;
  sku: string;
  title: string;
  slug: string;
  images: string[];
  price: number;
  stock?: number | null;
  weightKg?: number;
  sellingUnit?: string;
  isNoCOD?: boolean;
  brand: unknown;
  category: unknown;
};

const parsePrice = (value: number) => {
  if (!Number.isFinite(value)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Invalid product price found in catalog.',
    );
  }

  return value;
};

const parseWeight = (value: number | undefined) => {
  const weight = Number(value ?? 1);

  if (!Number.isFinite(weight) || weight < 0.01) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Invalid product weight found in catalog.',
    );
  }

  return weight;
};

const getAvailableStock = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const resolveSellingUnit = (value: unknown) => {
  return normalizeSellingUnit(value) ?? DEFAULT_SELLING_UNIT;
};

const createOrderId = () =>
  `ORD-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const decrementProductStock = async (sku: string, quantity: number) => {
  const currentProduct = await ProductModel.findOne({ sku, isActive: true })
    .select('stock')
    .lean();

  if (!currentProduct) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Not enough stock available for SKU ${sku}.`,
    );
  }

  const availableStock = getAvailableStock(currentProduct.stock);

  if (availableStock === null) {
    return currentProduct;
  }

  const updated = await ProductModel.findOneAndUpdate(
    { sku, isActive: true, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { returnDocument: 'after', runValidators: true },
  ).lean();

  if (!updated) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Not enough stock available for SKU ${sku}.`,
    );
  }

  return updated;
};

const resolveName = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'name' in value &&
    typeof (value as { name?: unknown }).name === 'string'
  ) {
    return (value as { name: string }).name;
  }

  return 'Unknown';
};

const buildOrderSnapshot = (
  product: ProductForCheckout,
  quantity: number,
): IOrderItemSnapshot => {
  const unitPrice = parsePrice(product.price);
  const weightKg = parseWeight(product.weightKg);

  return {
    product: product._id as never,
    title: product.title,
    slug: product.slug,
    sku: product.sku,
    image: product.images[0],
    brand: resolveName(product.brand),
    category: resolveName(product.category),
    unitPrice,
    sellingUnit: resolveSellingUnit(product.sellingUnit),
    weightKg,
    isNoCOD: Boolean(product.isNoCOD),
    quantity,
    lineTotal: unitPrice * quantity,
  };
};

const calculateOrderTotals = (
  payload: CreateOrderPayload,
  items: IOrderItemSnapshot[],
) =>
  CouponService.calculateCouponCheckoutSummary({
    couponCode: payload.couponCode,
    items: items.map((item) => ({
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      weightKg: item.weightKg,
      isNoCOD: item.isNoCOD,
    })),
    city: payload.customer.city,
    address: payload.customer.address,
  });

// 1. previewCheckoutFromDB
const previewCheckoutFromDB = async (payload: CreateOrderPayload) => {
  const skuList = payload.items.map((item) => item.sku);
  const products = (await ProductModel.find({
    sku: { $in: skuList },
    isActive: true,
  })
    .populate('brand', 'name')
    .populate('category', 'name')
    .lean()) as ProductForCheckout[];

  if (products.length !== skuList.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'One or more products are unavailable for ordering.',
    );
  }

  const productMap = new Map(products.map((product) => [product.sku, product]));

  const items: IOrderItemSnapshot[] = payload.items.map((item) => {
    const product = productMap.get(item.sku);

    if (!product) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Product with SKU ${item.sku} is unavailable.`,
      );
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Invalid quantity for SKU ${item.sku}.`,
      );
    }

    const unitStock = getAvailableStock(product.stock);

    if (unitStock !== null && unitStock <= 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Product with SKU ${item.sku} is out of stock.`,
      );
    }

    if (unitStock !== null && unitStock < item.quantity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Not enough stock available for SKU ${item.sku}.`,
      );
    }

    return buildOrderSnapshot(product, item.quantity);
  });

  const {
    subtotal,
    discount,
    totalWeightKg,
    shippingZone,
    shippingCharge,
    codEligible,
    codReasons,
    codUnavailableReasons,
    payableAmount,
  } = await calculateOrderTotals(payload, items);

  return {
    items,
    subtotal,
    discount,
    shippingZone,
    shippingCharge,
    totalWeightKg,
    codEligible,
    codAvailable: codEligible,
    codReasons,
    codUnavailableReasons,
    total: payableAmount,
    payableAmount,
  };
};

// 2. createOrderIntoDB
const createOrderIntoDB = async (user: IUser, payload: CreateOrderPayload) => {
  const skuList = payload.items.map((item) => item.sku);
  const products = (await ProductModel.find({
    sku: { $in: skuList },
    isActive: true,
  })
    .populate('brand', 'name')
    .populate('category', 'name')
    .lean()) as ProductForCheckout[];

  if (products.length !== skuList.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'One or more products are unavailable for ordering.',
    );
  }

  const productMap = new Map(products.map((product) => [product.sku, product]));

  const updatedStocks: Array<{ sku: string; quantity: number }> = [];

  try {
    const items: IOrderItemSnapshot[] = payload.items.map((item) => {
      const product = productMap.get(item.sku);

      if (!product) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Product with SKU ${item.sku} is unavailable.`,
        );
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Invalid quantity for SKU ${item.sku}.`,
        );
      }

      const unitStock = getAvailableStock(product.stock);

      if (unitStock !== null && unitStock <= 0) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Product with SKU ${item.sku} is out of stock.`,
        );
      }

      if (unitStock !== null && unitStock < item.quantity) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Not enough stock available for SKU ${item.sku}.`,
        );
      }

      return buildOrderSnapshot(product, item.quantity);
    });

    for (const item of payload.items) {
      await decrementProductStock(item.sku, item.quantity);
      updatedStocks.push({ sku: item.sku, quantity: item.quantity });
    }

    const {
      subtotal,
      discount,
      totalWeightKg,
      shippingZone,
      shippingCharge,
      codEligible,
      codReasons,
      payableAmount,
      coupon,
    } = await calculateOrderTotals(payload, items);
    const delivery = shippingCharge;
    const total = payableAmount;
    const normalizedPaymentMethod = normalizePaymentMethod(
      payload.paymentMethod,
    );

    if (normalizedPaymentMethod === 'CASH_ON_DELIVERY' && !codEligible) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        codReasons.includes(
          'COD is not available for one or more products in your cart.',
        )
          ? 'COD is not available for one or more products in your cart.'
          : 'COD is not available for orders of 1000 BDT or below.',
      );
    }

    const paymentStatus: TPaymentStatus = 'UNPAID';
    const orderStatus: TOrderStatus =
      normalizedPaymentMethod === 'PORTPOS' ? 'PENDING_PAYMENT' : 'PLACED';
    const paymentGateway: TPaymentGateway =
      normalizedPaymentMethod === 'PORTPOS' ? 'PORTPOS' : 'CASH_ON_DELIVERY';

    const order = await OrderModel.create({
      orderId: createOrderId(),
      user: user._id,
      items,
      customer: {
        ...payload.customer,
        email: payload.customer.email || undefined,
        note: payload.customer.note || undefined,
      },
      subtotal,
      discount,
      delivery,
      shippingZone,
      shippingCharge,
      totalWeightKg,
      codEligible,
      codReasons,
      total,
      totalAmount: total,
      payableAmount: total,
      currency: 'BDT',
      couponCode: coupon?.code,
      paymentMethod: normalizedPaymentMethod,
      paymentGateway,
      paymentStatus,
      status: orderStatus,
    });

    if (normalizedPaymentMethod === 'CASH_ON_DELIVERY') {
      const recipientEmail = (
        payload.customer.email ||
        user.email ||
        ''
      ).trim();

      if (recipientEmail) {
        await sendOrderConfirmationEmail({
          email: recipientEmail,
          customerName: payload.customer.name,
          orderId: order.orderId,
          paymentMethod: normalizedPaymentMethod,
          confirmationKind: 'order',
          items: items.map((item) => ({
            title: item.title,
            sku: item.sku,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
          })),
          subtotal,
          discount,
          delivery,
          total,
          city: payload.customer.city,
          address: payload.customer.address,
        }).catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Failed to send COD order confirmation email:', error);
        });
      }
    }

    return order;
  } catch (error) {
    await Promise.all(
      updatedStocks.map((item) =>
        ProductModel.updateOne(
          { sku: item.sku },
          { $inc: { stock: item.quantity } },
        ),
      ),
    );

    throw error;
  }
};

// 3. getMyOrdersFromDB
const getMyOrdersFromDB = async (
  user: IUser,
  query: Record<string, unknown> = {},
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 50;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    OrderModel.find({ user: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    OrderModel.countDocuments({ user: user._id }),
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

// 4. getSingleOrderForUserFromDB
const getSingleOrderForUserFromDB = async (user: IUser, orderId: string) => {
  const order = await OrderModel.findOne({ orderId, user: user._id }).lean();

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found!');
  }

  return order;
};

// 5. getAllOrdersForAdminFromDB
const getAllOrdersForAdminFromDB = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 50;
  const skip = (page - 1) * limit;
  const status = typeof query.status === 'string' ? query.status : undefined;

  const filter: Record<string, unknown> = {};
  if (status) {
    filter.status = status;
  }

  const [data, total] = await Promise.all([
    OrderModel.find(filter)
      .populate('user', 'name email phone role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    OrderModel.countDocuments(filter),
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

// 6. updateOrderStatusIntoDB
const updateOrderStatusIntoDB = async (
  orderId: string,
  status: TOrderStatus,
) => {
  const order = await OrderModel.findOneAndUpdate(
    { orderId },
    { status },
    { returnDocument: 'after', runValidators: true },
  ).lean();

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found!');
  }

  return order;
};

// 7. getOrderByIdFromDB
const getOrderByIdFromDB = async (orderId: string) => {
  const order = await OrderModel.findOne({ orderId }).lean();

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found!');
  }

  return order;
};

// 8. updateOrderPaymentIntoDB
const updateOrderPaymentIntoDB = async (
  orderId: string,
  payload: Partial<{
    paymentStatus: TPaymentStatus;
    transactionId: string;
    gatewayUrl: string;
    paymentGateway: TPaymentGateway;
    invoiceId: string;
    paymentId: string;
    totalAmount: number;
    payableAmount: number;
    currency: string;
    status: TOrderStatus;
  }>,
) => {
  const order = await OrderModel.findOneAndUpdate({ orderId }, payload, {
    returnDocument: 'after',
    runValidators: true,
  }).lean();

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found!');
  }

  return order;
};

export const OrderService = {
  previewCheckoutFromDB,
  createOrderIntoDB,
  getMyOrdersFromDB,
  getSingleOrderForUserFromDB,
  getAllOrdersForAdminFromDB,
  updateOrderStatusIntoDB,
  getOrderByIdFromDB,
  updateOrderPaymentIntoDB,
};
