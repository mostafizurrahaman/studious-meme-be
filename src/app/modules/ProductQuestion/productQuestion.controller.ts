import httpStatus from 'http-status';
import { asyncHandler, sendResponse } from '../../utils';
import { ProductQuestionService } from './productQuestion.service';

const getParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const createQuestion = asyncHandler(async (req, res) => {
  const result = await ProductQuestionService.createQuestionIntoDB(
    req.user,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Question submitted successfully!',
    data: result,
  });
});

const getAnsweredQuestionsForProduct = asyncHandler(async (req, res) => {
  const result =
    await ProductQuestionService.getAnsweredQuestionsForProductFromDB(
      getParam(req.params.productId),
      req.query,
    );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Answered questions fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

const getAllQuestions = asyncHandler(async (req, res) => {
  const result = await ProductQuestionService.getAllQuestionsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Product questions fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

const answerQuestion = asyncHandler(async (req, res) => {
  const result = await ProductQuestionService.answerQuestionIntoDB(
    getParam(req.params.id),
    req.user,
    req.body.answer,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Question answered successfully!',
    data: result,
  });
});

const updateQuestionStatus = asyncHandler(async (req, res) => {
  const result = await ProductQuestionService.updateQuestionStatusIntoDB(
    getParam(req.params.id),
    req.body.status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Question status updated successfully!',
    data: result,
  });
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const result = await ProductQuestionService.deleteQuestionFromDB(
    getParam(req.params.id),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Question deleted successfully!',
    data: result,
  });
});

export const ProductQuestionController = {
  createQuestion,
  getAnsweredQuestionsForProduct,
  getAllQuestions,
  answerQuestion,
  updateQuestionStatus,
  deleteQuestion,
};
