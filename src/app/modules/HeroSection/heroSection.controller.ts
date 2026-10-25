import httpStatus from 'http-status';
import { AppError, asyncHandler, sendResponse } from '../../utils';
import { HeroSectionService } from './heroSection.service';
import { getParam } from '../../lib/getParam';

// 1. getHomeContent
const getHomeContent = asyncHandler(async (req, res) => {
  const result = await HeroSectionService.getHomeContentFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Home content fetched successfully!',
    data: result,
  });
});

// 2. createHeroBanner (Atomic)
const createHeroBanner = asyncHandler(async (req, res) => {
  const result = await HeroSectionService.createHeroBannerIntoDB(
    req.body,
    req.file,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Hero banner created successfully!',
    data: result,
  });
});

// 3. getAllHeroBanners (Atomic)
const getAllHeroBanners = asyncHandler(async (req, res) => {
  const result = await HeroSectionService.getAllHeroBannersFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hero banners fetched successfully!',
    data: result,
  });
});

// 4. getHeroBannerById (Atomic)
const getHeroBannerById = asyncHandler(async (req, res) => {
  const result = await HeroSectionService.getHeroBannerByIdFromDB(
    getParam(req.params.bannerId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hero banner fetched successfully!',
    data: result,
  });
});

// 5. updateHeroBanner (Atomic)
const updateHeroBanner = asyncHandler(async (req, res) => {
  const result = await HeroSectionService.updateHeroBannerIntoDB(
    getParam(req.params.bannerId),
    req.body,
    req.file,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hero banner updated successfully!',
    data: result,
  });
});

// 6. updateHeroBannerStatus (Atomic)
const updateHeroBannerStatus = asyncHandler(async (req, res) => {
  const result = await HeroSectionService.updateHeroBannerStatusIntoDB(
    getParam(req.params.bannerId),
    req.body.isActive,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hero banner status updated successfully!',
    data: result,
  });
});

// 7. reorderHeroBanners (Atomic)
const reorderHeroBanners = asyncHandler(async (req, res) => {
  const result = await HeroSectionService.reorderHeroBannersIntoDB(
    req.body.items,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hero banners reordered successfully!',
    data: result,
  });
});

// 8. deleteHeroBanner (Atomic)
const deleteHeroBanner = asyncHandler(async (req, res) => {
  const result = await HeroSectionService.deleteHeroBannerFromDB(
    getParam(req.params.bannerId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hero banner deleted successfully!',
    data: result,
  });
});

// --- Legacy Handlers ---
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

const getAllHeroSections = asyncHandler(async (_req, res) => {
  const result = await HeroSectionService.getAllHeroSectionsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hero sections fetched successfully!',
    data: result,
  });
});

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
  // Atomic
  createHeroBanner,
  getAllHeroBanners,
  getHeroBannerById,
  updateHeroBanner,
  updateHeroBannerStatus,
  reorderHeroBanners,
  deleteHeroBanner,
  // Legacy
  createHeroSection,
  getAllHeroSections,
  getHeroSection,
  updateHeroSection,
  deleteHeroSection,
};
