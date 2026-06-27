import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { AppError } from '../../utils';
import { IUser } from '../User/user.interface';
import { ProductModel } from '../Product/product.model';
import {
  DEFAULT_SELLING_UNIT,
  normalizeSellingUnit,
} from '../Product/selling-unit';
import { CartModel } from './cart.model';
import { CartHistoryModel } from './cartHistory.model';

const MAX_CART_ITEMS = 50;

const toObjectId = (value: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid product ID!');
  }

  return new Types.ObjectId(value);
};

const getActiveProductSnapshot = async (productId: string) => {
  const product = await ProductModel.findOne({
    _id: toObjectId(productId),
    isActive: true,
  })
    .populate({ path: 'brand', match: { isActive: true } })
    .populate({ path: 'category', match: { isActive: true } })
    .lean();

  if (!product || !product.brand || !product.category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
  }

  return {
    product,
    snapshot: {
      title: product.title,
      brand: (product.brand as unknown as { name: string }).name,
      category: (product.category as unknown as { name: string }).name,
      categorySlug: (product.category as unknown as { slug?: string }).slug,
      image: product.images[0],
      sku: product.sku,
      slug: product.slug,
      price: product.price,
      sellingUnit:
        normalizeSellingUnit(product.sellingUnit) ?? DEFAULT_SELLING_UNIT,
      stock: product.stock,
      weightKg: product.weightKg,
      isNoCOD: product.isNoCOD,
    },
  };
};

const getOrCreateCart = async (userId: Types.ObjectId) => {
  const cart = await CartModel.findOne({ user: userId });
  if (cart) return cart;

  return CartModel.create({
    user: userId,
    items: [],
    subtotal: 0,
    totalItems: 0,
  });
};

const recalculateCart = (cart: {
  items: Array<{ quantity: number; priceSnapshot: number }>;
}) => {
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.quantity * item.priceSnapshot,
    0,
  );
  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { subtotal, totalItems };
};

const addCartItemIntoDB = async (
  user: IUser,
  productId: string,
  quantity = 1,
) => {
  const { product, snapshot } = await getActiveProductSnapshot(productId);
  const cart = await getOrCreateCart(user._id);

  const existing = cart.items.find(
    (item) => String(item.product) === String(product._id),
  );
  if (existing) {
    existing.quantity += quantity;
    existing.priceSnapshot = snapshot.price;
    existing.productSnapshot = snapshot;
  } else {
    if (cart.items.length >= MAX_CART_ITEMS) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `You can add up to ${MAX_CART_ITEMS} distinct products to cart.`,
      );
    }

    cart.items.push({
      product: product._id as never,
      quantity,
      priceSnapshot: snapshot.price,
      productSnapshot: snapshot,
    });
  }

  const { subtotal, totalItems } = recalculateCart(cart);
  cart.subtotal = subtotal;
  cart.totalItems = totalItems;
  await cart.save();
  await CartHistoryModel.create({
    user: user._id,
    product: product._id,
    action: 'add',
    quantity,
    productSnapshot: snapshot,
  });
  return cart.toObject();
};

const updateCartItemIntoDB = async (
  user: IUser,
  productId: string,
  quantity: number,
) => {
  const cart = await getOrCreateCart(user._id);
  const item = cart.items.find(
    (entry) => String(entry.product) === String(toObjectId(productId)),
  );

  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart item not found!');
  }

  item.quantity = quantity;
  if (item.quantity <= 0) {
    cart.items = cart.items.filter(
      (entry) => String(entry.product) !== String(toObjectId(productId)),
    );
  }

  const { subtotal, totalItems } = recalculateCart(cart);
  cart.subtotal = subtotal;
  cart.totalItems = totalItems;
  await cart.save();

  await CartHistoryModel.create({
    user: user._id,
    product: item.product,
    action: 'update',
    quantity,
    productSnapshot: item.productSnapshot,
  });

  return cart.toObject();
};

const removeCartItemFromDB = async (user: IUser, productId: string) => {
  const cart = await getOrCreateCart(user._id);
  const productObjectId = toObjectId(productId);
  const removed = cart.items.find(
    (entry) => String(entry.product) === String(productObjectId),
  );
  cart.items = cart.items.filter(
    (entry) => String(entry.product) !== String(productObjectId),
  );
  const { subtotal, totalItems } = recalculateCart(cart);
  cart.subtotal = subtotal;
  cart.totalItems = totalItems;
  await cart.save();

  if (removed) {
    await CartHistoryModel.create({
      user: user._id,
      product: removed.product,
      action: 'remove',
      quantity: removed.quantity,
      productSnapshot: removed.productSnapshot,
    });
  }

  return cart.toObject();
};

const clearCartFromDB = async (user: IUser) => {
  const cart = await getOrCreateCart(user._id);
  cart.items = [];
  cart.subtotal = 0;
  cart.totalItems = 0;
  await cart.save();

  await CartHistoryModel.create({ user: user._id, action: 'clear' });

  return cart.toObject();
};

const getMyCartFromDB = async (user: IUser) => {
  const cart = await CartModel.findOne({ user: user._id })
    .populate('items.product')
    .lean();
  return cart ?? { user: user._id, items: [], subtotal: 0, totalItems: 0 };
};

const getAllCartsFromDB = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 50;
  const skip = (page - 1) * limit;
  const category =
    typeof query.category === 'string' ? query.category.trim() : '';
  const user = typeof query.user === 'string' ? query.user.trim() : '';

  const filter: Record<string, unknown> = {};
  if (user) filter.user = toObjectId(user);
  if (category) filter['items.productSnapshot.category'] = category;

  const [data, total] = await Promise.all([
    CartHistoryModel.find(filter)
      .populate('user', 'name email phone image role isActive')
      .populate('product')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CartHistoryModel.countDocuments(filter),
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

const getCartInsightsFromDB = async () => {
  const [categorySummary, productSummary, userSummary, total] =
    await Promise.all([
      CartHistoryModel.aggregate([
        { $match: { action: { $in: ['add', 'update', 'remove'] } } },
        {
          $group: {
            _id: '$productSnapshot.category',
            count: { $sum: { $ifNull: ['$quantity', 1] } },
            users: { $addToSet: '$user' },
          },
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            count: 1,
            userCount: { $size: '$users' },
          },
        },
        { $sort: { count: -1 } },
      ]),
      CartHistoryModel.aggregate([
        { $match: { action: { $in: ['add', 'update', 'remove'] } } },
        {
          $group: {
            _id: '$productSnapshot.title',
            count: { $sum: { $ifNull: ['$quantity', 1] } },
            category: { $first: '$productSnapshot.category' },
          },
        },
        { $project: { _id: 0, product: '$_id', count: 1, category: 1 } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      CartHistoryModel.aggregate([
        { $match: { action: { $in: ['add', 'update', 'remove', 'clear'] } } },
        {
          $group: {
            _id: '$user',
            count: { $sum: { $ifNull: ['$quantity', 1] } },
          },
        },
        { $project: { _id: 0, user: '$_id', count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      CartHistoryModel.aggregate([
        {
          $group: { _id: null, total: { $sum: { $ifNull: ['$quantity', 1] } } },
        },
      ]),
    ]);

  return {
    total: total[0]?.total ?? 0,
    categorySummary,
    productSummary,
    userSummary,
  };
};

export const CartService = {
  addCartItemIntoDB,
  updateCartItemIntoDB,
  removeCartItemFromDB,
  clearCartFromDB,
  getMyCartFromDB,
  getAllCartsFromDB,
  getCartInsightsFromDB,
};
