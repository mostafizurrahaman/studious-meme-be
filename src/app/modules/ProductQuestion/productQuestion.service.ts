import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { AppError } from '../../utils';
import { ProductModel } from '../Product/product.model';
import UserModel from '../User/user.model';
import { IUser } from '../User/user.interface';
import { ProductQuestionModel } from './productQuestion.model';
import { ProductQuestionStatus } from './productQuestion.interface';

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
      return { createdAt: 1, _id: 1 } as Record<string, 1 | -1>;
    case 'answeredAt-desc':
      return { answeredAt: -1, createdAt: -1 } as Record<string, 1 | -1>;
    case 'answeredAt-asc':
      return { answeredAt: 1, createdAt: 1 } as Record<string, 1 | -1>;
    case 'status-desc':
      return { status: -1, createdAt: -1 } as Record<string, 1 | -1>;
    case 'status-asc':
      return { status: 1, createdAt: -1 } as Record<string, 1 | -1>;
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

const createQuestionIntoDB = async (
  user: IUser,
  payload: { product: string; question: string },
) => {
  const productId = ensureObjectId(payload.product, 'Product ID');
  const product = await ProductModel.findOne({ _id: productId, isActive: true })
    .select('_id')
    .lean();

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
  }

  return ProductQuestionModel.create({
    product: product._id,
    user: user._id,
    question: payload.question.trim(),
    status: 'pending',
  });
};

const getAnsweredQuestionsForProductFromDB = async (
  productId: string,
  query: Record<string, unknown> = {},
) => {
  const validProductId = ensureObjectId(productId, 'Product ID');
  const product = await ProductModel.findOne({
    _id: validProductId,
    isActive: true,
  })
    .select('_id title slug')
    .lean();

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
  }

  const page = parsePositiveInteger(query.page, 1);
  const limit = Math.min(
    parsePositiveInteger(query.limit, DEFAULT_PUBLIC_LIMIT),
    MAX_LIMIT,
  );
  const skip = (page - 1) * limit;
  const filter = {
    product: product._id,
    status: 'answered' as ProductQuestionStatus,
  };
  const sort = resolveSort(query.sort, { answeredAt: -1, createdAt: -1 });

  const [data, total] = await Promise.all([
    ProductQuestionModel.find(filter)
      .populate({ path: 'user', select: 'name' })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    ProductQuestionModel.countDocuments(filter),
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

const getAllQuestionsFromDB = async (query: Record<string, unknown> = {}) => {
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
  const sort = resolveSort(query.sort, { createdAt: -1, _id: -1 });

  if (status) {
    filter.status = status;
  }

  if (searchTerm) {
    filter.question = { $regex: escapeRegExp(searchTerm), $options: 'i' };
  }

  if (productFilter) {
    const resolvedProductId = await resolveProductId(productFilter);
    filter.product = resolvedProductId ?? null;
  }

  if (userFilter) {
    const resolvedUserId = await resolveUserId(userFilter);
    filter.user = resolvedUserId ?? null;
  }

  const [data, total] = await Promise.all([
    ProductQuestionModel.find(filter)
      .populate({ path: 'product', select: 'title slug images' })
      .populate({ path: 'user', select: 'name email' })
      .populate({ path: 'answeredBy', select: 'name email' })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    ProductQuestionModel.countDocuments(filter),
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

const answerQuestionIntoDB = async (
  id: string,
  adminUser: IUser,
  answer: string,
) => {
  const questionId = ensureObjectId(id, 'Question ID');
  const existingQuestion = await ProductQuestionModel.findById(questionId)
    .select('_id')
    .lean();

  if (!existingQuestion) {
    throw new AppError(httpStatus.NOT_FOUND, 'Question not found!');
  }

  const updated = await ProductQuestionModel.findByIdAndUpdate(
    questionId,
    {
      answer: answer.trim(),
      status: 'answered',
      answeredBy: adminUser._id,
      answeredAt: new Date(),
    },
    { returnDocument: 'after', runValidators: true },
  )
    .populate({ path: 'product', select: 'title slug images' })
    .populate({ path: 'user', select: 'name email' })
    .populate({ path: 'answeredBy', select: 'name email' });

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, 'Question not found!');
  }

  return updated;
};

const updateQuestionStatusIntoDB = async (
  id: string,
  status: ProductQuestionStatus,
) => {
  const questionId = ensureObjectId(id, 'Question ID');
  const existingQuestion = await ProductQuestionModel.findById(questionId)
    .select('answeredAt answer')
    .lean();

  if (!existingQuestion) {
    throw new AppError(httpStatus.NOT_FOUND, 'Question not found!');
  }

  const updated = await ProductQuestionModel.findByIdAndUpdate(
    questionId,
    {
      status,
      ...(status === 'answered' && !existingQuestion.answeredAt
        ? { answeredAt: new Date() }
        : {}),
    },
    { returnDocument: 'after', runValidators: true },
  )
    .populate({ path: 'product', select: 'title slug images' })
    .populate({ path: 'user', select: 'name email' })
    .populate({ path: 'answeredBy', select: 'name email' });

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, 'Question not found!');
  }

  return updated;
};

const deleteQuestionFromDB = async (id: string) => {
  const questionId = ensureObjectId(id, 'Question ID');
  const deleted = await ProductQuestionModel.findByIdAndDelete(questionId)
    .populate({ path: 'product', select: 'title slug images' })
    .populate({ path: 'user', select: 'name email' })
    .populate({ path: 'answeredBy', select: 'name email' });

  if (!deleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Question not found!');
  }

  return deleted;
};

export const ProductQuestionService = {
  createQuestionIntoDB,
  getAnsweredQuestionsForProductFromDB,
  getAllQuestionsFromDB,
  answerQuestionIntoDB,
  updateQuestionStatusIntoDB,
  deleteQuestionFromDB,
};
