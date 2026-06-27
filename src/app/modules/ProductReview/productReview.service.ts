import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { AppError } from '../../utils';
import { OrderModel } from '../Order/order.model';
import { ProductModel } from '../Product/product.model';
import { ProductReviewModel } from './productReview.model';
import {
  IProductReview,
  TReviewSource,
  TReviewStatus,
} from './productReview.interface';
import { IUser } from '../User/user.interface';
import UserModel from '../User/user.model';
import { defaultUserImage } from '../User/user.constant';

const DEFAULT_PUBLIC_LIMIT = 5;
const DEFAULT_ADMIN_LIMIT = 20;
const MAX_LIMIT = 100;

const getString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const ensureObjectId = (value: string, label: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError(httpStatus.BAD_REQUEST, `${label} is invalid!`);
  }

  return value;
};

const resolveSort = (
  value: unknown,
  fallback: Record<string, 1 | -1>,
): Record<string, 1 | -1> => {
  switch (getString(value)) {
    case 'createdAt-asc':
      return { createdAt: 1, _id: 1 };
    case 'rating-desc':
      return { rating: -1, createdAt: -1 };
    case 'rating-asc':
      return { rating: 1, createdAt: 1 };
    case 'status-desc':
      return { status: -1, createdAt: -1 };
    case 'status-asc':
      return { status: 1, createdAt: -1 };
    case 'createdAt-desc':
    default:
      return fallback;
  }
};

const resolveProductId = async (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) return null;

  if (Types.ObjectId.isValid(trimmed)) {
    const direct = await ProductModel.findById(trimmed).select('_id').lean();
    if (direct) return direct._id;
  }

  const product = await ProductModel.findOne({
    $or: [
      { slug: trimmed },
      { title: { $regex: `^${escapeRegExp(trimmed)}$`, $options: 'i' } },
    ],
  })
    .select('_id')
    .lean();

  return product?._id ?? null;
};

const resolveUserId = async (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) return null;

  if (Types.ObjectId.isValid(trimmed)) {
    const direct = await UserModel.findById(trimmed).select('_id').lean();
    if (direct) return direct._id;
  }

  const lower = trimmed.toLowerCase();
  const user = await UserModel.findOne({
    $or: [
      { email: lower },
      { name: { $regex: `^${escapeRegExp(trimmed)}$`, $options: 'i' } },
    ],
  })
    .select('_id')
    .lean();

  return user?._id ?? null;
};

const resolveDisplayName = (user: IUser) => user.name?.trim() || 'Customer';

const resolveDisplayImage = (user: IUser) => user.image?.trim() || '';

const resolveReviewDisplayImage = (value: unknown, fallback: string) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback;
};

const assertProductExists = async (
  productId: string | Types.ObjectId,
  { activeOnly }: { activeOnly: boolean },
) => {
  const normalizedProductId =
    typeof productId === 'string' ? productId : productId.toString();

  const product = await ProductModel.findOne(
    activeOnly
      ? { _id: normalizedProductId, isActive: true }
      : { _id: normalizedProductId },
  )
    .select('_id title slug images rating')
    .lean();

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
  }

  return product;
};

const findDeliveredOrderForProduct = async (
  userId: Types.ObjectId,
  productId: Types.ObjectId,
) => {
  return OrderModel.findOne({
    user: userId,
    status: 'DELIVERED',
    'items.product': productId,
  })
    .select('_id orderId items')
    .lean();
};

const recalculateProductReviewStats = async (
  productId: string | Types.ObjectId,
) => {
  const productObjectId =
    typeof productId === 'string'
      ? ensureObjectId(productId, 'Product ID')
      : productId;

  const [stats] = await ProductReviewModel.aggregate<{
    total: number;
    averageRating: number;
  }>([
    {
      $match: {
        product: productObjectId,
        status: 'approved',
      },
    },
    {
      $group: {
        _id: '$product',
        total: { $sum: 1 },
        averageRating: { $avg: '$rating' },
      },
    },
  ]);

  const total = stats?.total ?? 0;
  const averageRating =
    total > 0 ? Number((stats?.averageRating ?? 0).toFixed(1)) : 0;

  await ProductModel.findByIdAndUpdate(
    productObjectId,
    { rating: averageRating },
    { runValidators: true },
  );

  return { total, averageRating };
};

const mapPublicReview = (review: IProductReview) => ({
  _id: review._id,
  displayName: review.displayName,
  displayImage: review.displayImage,
  rating: review.rating,
  comment: review.comment,
  images: review.images ?? [],
  createdAt: review.createdAt,
});

const mapAdminReview = (review: IProductReview) => ({
  ...review,
});

const createCustomerReviewIntoDB = async (
  user: IUser,
  payload: {
    product: string;
    rating: number;
    comment: string;
    images?: string[];
  },
) => {
  const productId = await resolveProductId(payload.product);

  if (!productId) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
  }

  const product = await assertProductExists(productId, { activeOnly: true });

  const duplicateReview = await ProductReviewModel.findOne({
    product: product._id,
    user: user._id,
    source: 'customer',
  })
    .select('_id')
    .lean();

  if (duplicateReview) {
    throw new AppError(
      httpStatus.CONFLICT,
      'You have already reviewed this product!',
    );
  }

  const deliveredOrder = await findDeliveredOrderForProduct(
    user._id,
    product._id,
  );

  if (!deliveredOrder) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can review this product after delivery.',
    );
  }

  const review = await ProductReviewModel.create({
    product: product._id,
    user: user._id,
    createdBy: undefined,
    displayName: resolveDisplayName(user),
    displayImage: resolveDisplayImage(user),
    rating: payload.rating,
    comment: payload.comment.trim(),
    images: payload.images ?? [],
    isVerifiedPurchase: true,
    source: 'customer',
    status: 'pending',
  });

  return review;
};

const createManualReviewIntoDB = async (
  adminUser: IUser,
  payload: {
    product: string;
    displayName: string;
    displayImage?: string;
    rating: number;
    comment: string;
    images?: string[];
    status?: TReviewStatus;
  },
) => {
  const productId = await resolveProductId(payload.product);

  if (!productId) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
  }

  const product = await assertProductExists(productId, { activeOnly: false });

  const review = await ProductReviewModel.create({
    product: product._id,
    createdBy: adminUser._id,
    displayName: payload.displayName.trim(),
    displayImage: resolveReviewDisplayImage(payload.displayImage, defaultUserImage),
    rating: payload.rating,
    comment: payload.comment.trim(),
    images: payload.images ?? [],
    isVerifiedPurchase: false,
    source: 'manual' as TReviewSource,
    status: payload.status ?? 'approved',
  });

  if (review.status === 'approved') {
    await recalculateProductReviewStats(product._id);
  }

  return review;
};

const getApprovedReviewsForProductFromDB = async (
  productId: string,
  query: Record<string, unknown> = {},
) => {
  const validProductId = ensureObjectId(productId, 'Product ID');
  const product = await assertProductExists(validProductId, {
    activeOnly: true,
  });

  const page = parsePositiveInteger(query.page, 1);
  const limit = Math.min(
    parsePositiveInteger(query.limit, DEFAULT_PUBLIC_LIMIT),
    MAX_LIMIT,
  );
  const skip = (page - 1) * limit;
  const sort = resolveSort(query.sort, { createdAt: -1, _id: -1 });
  const filter = { product: product._id, status: 'approved' as TReviewStatus };

  const [data, total, summary] = await Promise.all([
    ProductReviewModel.find(filter)
      .select('displayName displayImage rating comment images createdAt')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    ProductReviewModel.countDocuments(filter),
    ProductReviewModel.aggregate<{ total: number; averageRating: number }>([
      { $match: filter },
      {
        $group: {
          _id: '$product',
          total: { $sum: 1 },
          averageRating: { $avg: '$rating' },
        },
      },
    ]),
  ]);

  const stats = summary[0];

  return {
    data: data.map(mapPublicReview),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    summary: {
      total,
      averageRating:
        total > 0 ? Number((stats?.averageRating ?? 0).toFixed(1)) : 0,
      productRating: product.rating,
    },
  };
};

const getAllReviewsFromDB = async (query: Record<string, unknown> = {}) => {
  const page = parsePositiveInteger(query.page, 1);
  const limit = Math.min(
    parsePositiveInteger(query.limit, DEFAULT_ADMIN_LIMIT),
    MAX_LIMIT,
  );
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};
  const searchTerm = getString(query.searchTerm);
  const productFilter = getString(query.product);
  const userFilter = getString(query.user);
  const status = getString(query.status);
  const source = getString(query.source);
  const rating =
    typeof query.rating === 'number' ? query.rating : Number(query.rating);
  const createdFrom = getString(query.createdFrom);
  const createdTo = getString(query.createdTo);
  const sort = resolveSort(query.sort, { createdAt: -1, _id: -1 });

  if (status) filter.status = status;
  if (source) filter.source = source;
  if (Number.isFinite(rating) && rating > 0) filter.rating = rating;

  if (searchTerm) {
    filter.$or = [
      { comment: { $regex: escapeRegExp(searchTerm), $options: 'i' } },
      { displayName: { $regex: escapeRegExp(searchTerm), $options: 'i' } },
    ];
  }

  if (createdFrom || createdTo) {
    filter.createdAt = {
      ...(createdFrom ? { $gte: new Date(createdFrom) } : {}),
      ...(createdTo ? { $lte: new Date(createdTo) } : {}),
    };
  }

  if (productFilter) {
    const resolvedProductId = await resolveProductId(productFilter);
    filter.product = resolvedProductId ?? null;
  }

  if (userFilter) {
    const resolvedUserId = await resolveUserId(userFilter);
    filter.user = resolvedUserId ?? null;
  }

  const [data, total, summary] = await Promise.all([
    ProductReviewModel.find(filter)
      .populate({ path: 'product', select: 'title slug images' })
      .populate({ path: 'user', select: 'name email image' })
      .populate({ path: 'createdBy', select: 'name email image' })
      .populate({ path: 'approvedBy', select: 'name email image' })
      .populate({ path: 'rejectedBy', select: 'name email image' })
      .populate({ path: 'hiddenBy', select: 'name email image' })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    ProductReviewModel.countDocuments(filter),
    ProductReviewModel.aggregate<{
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      hidden: number;
      customer: number;
      manual: number;
      averageRating: number;
    }>([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
          hidden: { $sum: { $cond: [{ $eq: ['$status', 'hidden'] }, 1, 0] } },
          customer: {
            $sum: { $cond: [{ $eq: ['$source', 'customer'] }, 1, 0] },
          },
          manual: { $sum: { $cond: [{ $eq: ['$source', 'manual'] }, 1, 0] } },
          averageRating: { $avg: '$rating' },
        },
      },
    ]),
  ]);

  const stats = summary[0];

  return {
    data: data.map(mapAdminReview),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    summary: {
      total: stats?.total ?? 0,
      pending: stats?.pending ?? 0,
      approved: stats?.approved ?? 0,
      rejected: stats?.rejected ?? 0,
      hidden: stats?.hidden ?? 0,
      customer: stats?.customer ?? 0,
      manual: stats?.manual ?? 0,
      averageRating: Number((stats?.averageRating ?? 0).toFixed(1)),
    },
  };
};

const updateReviewIntoDB = async (
  id: string,
  payload: Partial<{
    displayName: string;
    displayImage: string;
    rating: number;
    comment: string;
    images: string[];
    status: TReviewStatus;
  }>,
  adminUser?: IUser,
) => {
  const reviewId = ensureObjectId(id, 'Review ID');
  const existingReview = await ProductReviewModel.findById(reviewId)
    .select('product status source')
    .lean();

  if (!existingReview) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found!');
  }

  const update: Record<string, unknown> = {};

  if (typeof payload.displayName === 'string')
    update.displayName = payload.displayName.trim();
  if (typeof payload.displayImage === 'string')
    update.displayImage = payload.displayImage.trim();
  if (typeof payload.rating === 'number') update.rating = payload.rating;
  if (typeof payload.comment === 'string')
    update.comment = payload.comment.trim();
  if (Array.isArray(payload.images)) update.images = payload.images;

  if (payload.status) {
    update.status = payload.status;

    if (payload.status === 'approved' && adminUser) {
      update.approvedBy = adminUser._id;
      update.approvedAt = new Date();
      update.rejectedBy = undefined;
      update.rejectedAt = undefined;
      update.hiddenBy = undefined;
      update.hiddenAt = undefined;
    }

    if (payload.status === 'rejected' && adminUser) {
      update.rejectedBy = adminUser._id;
      update.rejectedAt = new Date();
      update.approvedBy = undefined;
      update.approvedAt = undefined;
      update.hiddenBy = undefined;
      update.hiddenAt = undefined;
    }

    if (payload.status === 'hidden' && adminUser) {
      update.hiddenBy = adminUser._id;
      update.hiddenAt = new Date();
      update.approvedBy = undefined;
      update.approvedAt = undefined;
      update.rejectedBy = undefined;
      update.rejectedAt = undefined;
    }
  }

  const updated = await ProductReviewModel.findByIdAndUpdate(reviewId, update, {
    returnDocument: 'after',
    runValidators: true,
  })
    .populate({ path: 'product', select: 'title slug images' })
    .populate({ path: 'user', select: 'name email image' })
    .populate({ path: 'createdBy', select: 'name email image' })
    .populate({ path: 'approvedBy', select: 'name email image' })
    .populate({ path: 'rejectedBy', select: 'name email image' })
    .populate({ path: 'hiddenBy', select: 'name email image' });

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found!');
  }

  await recalculateProductReviewStats(existingReview.product as Types.ObjectId);

  return updated;
};

const updateReviewStatusIntoDB = async (
  id: string,
  status: TReviewStatus,
  adminUser: IUser,
) => {
  return updateReviewIntoDB(id, { status }, adminUser);
};

const deleteReviewFromDB = async (id: string) => {
  const reviewId = ensureObjectId(id, 'Review ID');
  const deleted = await ProductReviewModel.findByIdAndDelete(reviewId)
    .populate({ path: 'product', select: 'title slug images' })
    .populate({ path: 'user', select: 'name email image' })
    .populate({ path: 'createdBy', select: 'name email image' });

  if (!deleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found!');
  }

  const deletedProductId =
    deleted.product &&
    typeof deleted.product === 'object' &&
    '_id' in deleted.product
      ? (deleted.product as { _id: Types.ObjectId })._id
      : (deleted.product as Types.ObjectId);

  await recalculateProductReviewStats(deletedProductId);

  return deleted;
};

export const ProductReviewService = {
  createCustomerReviewIntoDB,
  createManualReviewIntoDB,
  getApprovedReviewsForProductFromDB,
  getAllReviewsFromDB,
  updateReviewIntoDB,
  updateReviewStatusIntoDB,
  deleteReviewFromDB,
  recalculateProductReviewStats,
};
