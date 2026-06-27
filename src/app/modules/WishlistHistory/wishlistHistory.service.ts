import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { AppError } from '../../utils';
import { IUser } from '../User/user.interface';
import { ProductModel } from '../Product/product.model';
import {
  DEFAULT_SELLING_UNIT,
  normalizeSellingUnit,
} from '../Product/selling-unit';
import { WishlistHistoryModel } from './wishlistHistory.model';
import { WishlistHistoryEventModel } from './wishlistHistoryEvent.model';

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
      images: product.images,
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

const addWishlistItemIntoDB = async (user: IUser, productId: string) => {
  const { product, snapshot } = await getActiveProductSnapshot(productId);

  const result = await WishlistHistoryModel.findOneAndUpdate(
    { user: user._id, product: product._id },
    { user: user._id, product: product._id, productSnapshot: snapshot },
    { upsert: true, new: true, runValidators: true },
  ).lean();

  await WishlistHistoryEventModel.create({
    user: user._id,
    product: product._id,
    productSnapshot: snapshot,
    action: 'add',
  });

  return result;
};

const removeWishlistItemFromDB = async (user: IUser, productId: string) => {
  const productObjectId = toObjectId(productId);
  const existing = await WishlistHistoryModel.findOne({
    user: user._id,
    product: productObjectId,
  }).lean();
  await WishlistHistoryModel.findOneAndDelete({
    user: user._id,
    product: productObjectId,
  });

  if (existing?.productSnapshot) {
    await WishlistHistoryEventModel.create({
      user: user._id,
      product: productObjectId,
      productSnapshot: existing.productSnapshot,
      action: 'remove',
    });
  }

  return null;
};

const getMyWishlistFromDB = async (user: IUser) =>
  WishlistHistoryModel.find({ user: user._id })
    .populate('product')
    .sort({ updatedAt: -1 })
    .lean();

const getAllWishlistFromDB = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 50;
  const skip = (page - 1) * limit;
  const category =
    typeof query.category === 'string' ? query.category.trim() : '';
  const user = typeof query.user === 'string' ? query.user.trim() : '';

  const filter: Record<string, unknown> = {};
  if (category) filter['productSnapshot.category'] = category;
  if (user) filter.user = toObjectId(user);

  const [data, total] = await Promise.all([
    WishlistHistoryEventModel.find(filter)
      .populate('user', 'name email phone image role isActive')
      .populate('product')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WishlistHistoryEventModel.countDocuments(filter),
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

const getWishlistInsightsFromDB = async () => {
  const [categorySummary, productSummary, userSummary, total] =
    await Promise.all([
      WishlistHistoryEventModel.aggregate([
        {
          $group: {
            _id: '$productSnapshot.category',
            count: { $sum: 1 },
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
      WishlistHistoryEventModel.aggregate([
        {
          $group: {
            _id: '$productSnapshot.title',
            count: { $sum: 1 },
            category: { $first: '$productSnapshot.category' },
          },
        },
        { $project: { _id: 0, product: '$_id', count: 1, category: 1 } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      WishlistHistoryEventModel.aggregate([
        { $group: { _id: '$user', count: { $sum: 1 } } },
        { $project: { _id: 0, user: '$_id', count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      WishlistHistoryEventModel.countDocuments(),
    ]);

  return {
    total,
    categorySummary,
    productSummary,
    userSummary,
  };
};

export const WishlistHistoryService = {
  addWishlistItemIntoDB,
  removeWishlistItemFromDB,
  getMyWishlistFromDB,
  getAllWishlistFromDB,
  getWishlistInsightsFromDB,
};
