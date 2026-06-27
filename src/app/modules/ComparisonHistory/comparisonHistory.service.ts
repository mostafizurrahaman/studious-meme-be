import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { AppError } from '../../utils';
import { ProductModel } from '../Product/product.model';
import {
  DEFAULT_SELLING_UNIT,
  normalizeSellingUnit,
} from '../Product/selling-unit';
import { IUser } from '../User/user.interface';
import { ComparisonHistoryModel } from './comparisonHistory.model';
import { ComparisonHistoryEventModel } from './comparisonHistoryEvent.model';

const MAX_COMPARE_ITEMS = 4;

const toObjectId = (value: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid product ID!');
  }

  return new Types.ObjectId(value);
};

const getProductSnapshot = async (productId: string) => {
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
      subCategorySlug: product.subCategorySlug ?? '',
      images: product.images,
      sku: product.sku,
      slug: product.slug,
      price: product.price,
      sellingUnit:
        normalizeSellingUnit(product.sellingUnit) ?? DEFAULT_SELLING_UNIT,
      stock: product.stock,
      rating: product.rating,
      oldPrice: product.oldPrice,
      isFeatured: product.isFeatured,
      weightKg: product.weightKg,
      isNoCOD: product.isNoCOD,
    },
  };
};

const addComparisonItemIntoDB = async (user: IUser, productId: string) => {
  const { product, snapshot } = await getProductSnapshot(productId);
  const currentItems = await ComparisonHistoryModel.find({
    user: user._id,
  }).lean();

  if (
    currentItems.some((item) => String(item.product) === String(product._id))
  ) {
    return (
      currentItems.find(
        (item) => String(item.product) === String(product._id),
      ) ?? null
    );
  }

  if (currentItems.length >= MAX_COMPARE_ITEMS) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You can compare up to ${MAX_COMPARE_ITEMS} products at a time.`,
    );
  }

  if (currentItems.length > 0) {
    const currentCategory = currentItems[0]?.productSnapshot?.category;
    if (currentCategory && currentCategory !== snapshot.category) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You can compare only products from the same category.',
      );
    }
  }

  const result = await ComparisonHistoryModel.create({
    user: user._id,
    product: product._id,
    productSnapshot: snapshot,
  });

  await ComparisonHistoryEventModel.create({
    user: user._id,
    product: product._id,
    productSnapshot: snapshot,
    action: 'add',
  });

  return result;
};

const removeComparisonItemFromDB = async (user: IUser, productId: string) => {
  const productObjectId = toObjectId(productId);
  const existing = await ComparisonHistoryModel.findOne({
    user: user._id,
    product: productObjectId,
  }).lean();
  await ComparisonHistoryModel.findOneAndDelete({
    user: user._id,
    product: productObjectId,
  });

  if (existing?.productSnapshot) {
    await ComparisonHistoryEventModel.create({
      user: user._id,
      product: productObjectId,
      productSnapshot: existing.productSnapshot,
      action: 'remove',
    });
  }

  return null;
};

const getMyComparisonHistoryFromDB = async (user: IUser) => {
  return ComparisonHistoryModel.find({ user: user._id })
    .sort({ updatedAt: -1 })
    .lean();
};

const getAllComparisonHistoryFromDB = async (
  query: Record<string, unknown>,
) => {
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
    ComparisonHistoryEventModel.find(filter)
      .populate('user', 'name email phone image role isActive')
      .populate('product')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ComparisonHistoryEventModel.countDocuments(filter),
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

const getComparisonInsightsFromDB = async () => {
  const [categorySummary, productSummary, userSummary, total] =
    await Promise.all([
      ComparisonHistoryEventModel.aggregate([
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
      ComparisonHistoryEventModel.aggregate([
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
      ComparisonHistoryEventModel.aggregate([
        { $group: { _id: '$user', count: { $sum: 1 } } },
        { $project: { _id: 0, user: '$_id', count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      ComparisonHistoryEventModel.countDocuments(),
    ]);

  return {
    total,
    categorySummary,
    productSummary,
    userSummary,
  };
};

export const ComparisonHistoryService = {
  addComparisonItemIntoDB,
  removeComparisonItemFromDB,
  getMyComparisonHistoryFromDB,
  getAllComparisonHistoryFromDB,
  getComparisonInsightsFromDB,
};
