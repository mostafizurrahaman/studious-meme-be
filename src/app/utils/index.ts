import config from '../config';
import AppError from './AppError';
import asyncHandler from './asyncHandler';
import { deleteFile } from './deleteFile';
import globalErrorHandler from './globalErrorHandler';
import notFoundHandler from './notFound';
import sendContactUsEmail from './sendContactUsEmail';
import sendOrderConfirmationEmail from './sendOrderConfirmationEmail';
import sendOtpEmail from './sendOtpEmail';
import sendResponse from './sendResponse';
import {
  deleteImageByUrl,
  deleteMultipleImagesByUrls,
  identifyImageStorageProvider,
  isCloudflareR2Url,
  isCloudinaryUrl,
  uploadImageToStorage,
} from './imageStorage';
import {
  deleteImageFromR2,
  extractR2KeyFromUrl,
  getR2Client,
  uploadImageToR2,
} from './r2Storage';
import { R2_FOLDERS, TR2Folder } from '../constants/storage.constant';

// JWT configuration
const options = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: config.NODE_ENV === 'production' ? 'none' : 'strict',
  maxAge: 365 * 24 * 60 * 60 * 1000,
};

export {
  AppError,
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
  options,
  sendOtpEmail,
  deleteFile,
  sendContactUsEmail,
  sendOrderConfirmationEmail,
  sendResponse,
  // R2 and Unified Image Storage utilities
  deleteImageByUrl,
  deleteMultipleImagesByUrls,
  identifyImageStorageProvider,
  isCloudflareR2Url,
  isCloudinaryUrl,
  uploadImageToStorage,
  deleteImageFromR2,
  extractR2KeyFromUrl,
  getR2Client,
  uploadImageToR2,
  R2_FOLDERS,
  type TR2Folder,
};
