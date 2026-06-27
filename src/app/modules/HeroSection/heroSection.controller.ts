import httpStatus from 'http-status';
import { AppError, asyncHandler, sendResponse } from '../../utils';
import { HeroSectionService } from './heroSection.service';
import { getParam } from '../../lib/getParam';

// 1. getHomeContent
const getHomeContent = asyncHandler(async (req, res) => {
  const result = await HeroSectionService.getHomeContentFromDB(req.query);

  // console.dir({ result }, { depth: null });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Home content fetched successfully!',
    data: result,
  });
});

// 2. createHeroSection
const createHeroSection = asyncHandler(async (req, res) => {
  const result = await HeroSectionService.createHeroSectionIntoDB(
    req.body,
    req.files,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Hero section created successfully!',
    data: result,
  });
});

// 3. getAllHeroSections
const getAllHeroSections = asyncHandler(async (_req, res) => {
  const result = await HeroSectionService.getAllHeroSectionsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hero sections fetched successfully!',
    data: result,
  });
});

// 4. getHeroSection
const getHeroSection = asyncHandler(async (req, res) => {
  const result = await HeroSectionService.getHeroSectionByIdFromDB(
    getParam(req.params.heroSectionId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hero section fetched successfully!',
    data: result,
  });
});

// 5. updateHeroSection
const updateHeroSection = asyncHandler(async (req, res) => {
  const result = await HeroSectionService.updateHeroSectionIntoDB(
    getParam(req.params.heroSectionId),
    req.body,
    req.files,
  );

  if (!result)
    throw new AppError(httpStatus.NOT_FOUND, 'Hero section not found!');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hero section updated successfully!',
    data: result,
  });
});

// 6. deleteHeroSection
const deleteHeroSection = asyncHandler(async (req, res) => {
  const result = await HeroSectionService.deleteHeroSectionFromDB(
    getParam(req.params.heroSectionId),
  );

  if (!result)
    throw new AppError(httpStatus.NOT_FOUND, 'Hero section not found!');

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hero section deleted successfully!',
    data: result,
  });
});

export const HeroSectionController = {
  getHomeContent,
  createHeroSection,
  getAllHeroSections,
  getHeroSection,
  updateHeroSection,
  deleteHeroSection,
};
