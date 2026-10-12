import { createAccessToken, createRefreshToken, verifyToken } from './token';
import generateOtp from './generateOtp';
import multerUpload, {
  deleteImageByUrl,
  deleteImageFromCloudinary,
  deleteImageFromR2,
  identifyImageStorageProvider,
  isCloudflareR2Url,
  isCloudinaryUrl,
  sendImageToCloudinary,
  sendImageToR2,
  uploadFilesAndInjectUrls,
  uploadImageToR2,
  uploadImageToStorage,
} from './upload';

import { R2_FOLDERS, TR2Folder } from '../constants/storage.constant';

export {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  generateOtp,
  multerUpload,
  sendImageToCloudinary,
  sendImageToR2,
  uploadImageToR2,
  uploadImageToStorage,
  deleteImageFromCloudinary,
  deleteImageFromR2,
  deleteImageByUrl,
  identifyImageStorageProvider,
  isCloudflareR2Url,
  isCloudinaryUrl,
  uploadFilesAndInjectUrls,
  R2_FOLDERS,
  type TR2Folder,
};
