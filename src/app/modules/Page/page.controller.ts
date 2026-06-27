import httpStatus from 'http-status';
import { asyncHandler } from '../../utils';
import { sendResponse } from '../../utils';
import { TPageSlugs } from './page.constant';
import { PageService } from './page.service';

// 1. createOrUpdatePage
const createOrUpdatePage = asyncHandler(async (req, res) => {
  const result = await PageService.createOrUpdatePageIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Page created successfully!',
    data: result,
  });
});

// 2. getAllPages
const getAllPages = asyncHandler(async (req, res) => {
  const result = await PageService.getAllPagesFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Pages retrieved successfully!',
    data: result,
  });
});

// 3. getPageBySlug
const getPageBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const result = await PageService.getPageBySlugFromDB(slug as TPageSlugs);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Page retrieved successfully!',
    data: result,
  });
});

export const PageController = {
  createOrUpdatePage,
  getAllPages,
  getPageBySlug,
};
