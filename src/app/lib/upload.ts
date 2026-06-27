// import multer from 'multer';
// import path from 'path';
// // import { v4 as uuidv4 } from 'uuid';
// import { AppError } from '../utils';
// import httpStatus from 'http-status';
// import fs from 'fs';

// const storage = multer.diskStorage({
//   destination: (req, file, callback) => {
//     let folderPath = './public';

//     if (file.mimetype.startsWith('image')) {
//       folderPath = './public/images';
//     } else if (file.mimetype.startsWith('video')) {
//       folderPath = './public/videos';
//     } else {
//       callback(
//         new AppError(
//           httpStatus.BAD_REQUEST,
//           'Only images and videos are allowed'
//         ),
//         './public'
//       );
//       return;
//     }

//     // Check if the folder exists, if not, create it
//     if (!fs.existsSync(folderPath)) {
//       fs.mkdirSync(folderPath, { recursive: true });
//     }

//     callback(null, folderPath);
//   },

//   filename(_req, file, callback) {
//     const fileExt = path.extname(file.originalname);
//     const fileName = `${file.originalname
//       .replace(fileExt, '')
//       .toLocaleLowerCase()
//       .split(' ')
//       .join('-')}-${Date.now()}`;
//     // .join('-')}-${uuidv4()}`;

//     callback(null, fileName + fileExt);
//   },
// });

// const upload = multer({ storage });

// export default upload;

// import { v2 as cloudinary, ConfigOptions } from 'cloudinary';
// import multer, { StorageEngine } from 'multer';
// import {
//   CloudinaryStorage,
//   Options as CloudinaryStorageOptions,
// } from 'multer-storage-cloudinary';
// import config from '../config';

// //** cloudinary configuration starts(A-6)
// const cloudinaryConfig: ConfigOptions = {
//   cloud_name: config.cloudinary.cloud_name,
//   api_key: config.cloudinary.api_key,
//   api_secret: config.cloudinary.api_secret,
// };

// cloudinary.config(cloudinaryConfig);

// const cloudinaryUpload: typeof cloudinary = cloudinary;

// // NEW: Delete Function Added Here
// // function for getting publicId from imageurl
// const getPublicIdFromUrl = (imageUrl: string): string => {
//   const splitUrl = imageUrl.split('/');
//   const lastSegment = splitUrl[splitUrl.length - 1];
//   const publicId = lastSegment.split('.')[0];
//   return publicId;
// };

// // function for deleting image from cloudinary
// export const deleteImageFromCloudinary = async (
//   imageUrl: string
// ): Promise<void> => {
//   const publicId = getPublicIdFromUrl(imageUrl);

//   return new Promise((resolve, reject) => {
//     cloudinary.uploader.destroy(publicId, (error, result) => {
//       if (error) {
//         // eslint-disable-next-line no-console
//         console.log('Error deleting image from Cloudinary:', error);
//         reject(error);
//       } else {
//         // eslint-disable-next-line no-console
//         console.log('Image deleted from Cloudinary:', result);
//         resolve();
//       }
//     });
//   });
// };

// //** multer configuration starts(A-6)
// // remove file Extension as .png .jpg etc.(A-6)
// const removeExtension = (filename: string): string => {
//   return filename.split('.').slice(0, -1).join('.').replace(/ /g, '-');
// };

// const storageOptions: CloudinaryStorageOptions = {
//   cloudinary: cloudinaryUpload,
//   params: {
//     public_id: (_req, file): string =>
//       Math.random().toString(36).substring(2) +
//       '-' +
//       Date.now() +
//       '-' +
//       file.fieldname +
//       '-' +
//       removeExtension(file.originalname),
//   },
// };

// const storage: StorageEngine = new CloudinaryStorage(storageOptions);

// const multerUpload: multer.Multer = multer({ storage: storage });

// export default multerUpload;

// import { v2 as cloudinary, ConfigOptions, UploadApiResponse } from 'cloudinary';
// import multer from 'multer';
// import config from '../config';
// import { Readable } from 'stream';

// //** cloudinary configuration starts(A-6)
// const cloudinaryConfig: ConfigOptions = {
//   cloud_name: config.cloudinary.cloud_name,
//   api_key: config.cloudinary.api_key,
//   api_secret: config.cloudinary.api_secret,
// };

// cloudinary.config(cloudinaryConfig);

// // NEW: Delete Function Added Here
// // function for getting publicId from imageurl
// const getPublicIdFromUrl = (imageUrl: string): string => {
//   const splitUrl = imageUrl.split('/');
//   const lastSegment = splitUrl[splitUrl.length - 1];
//   const publicId = lastSegment.split('.')[0];
//   return publicId;
// };

// // function for deleting image from cloudinary
// export const deleteImageFromCloudinary = async (
//   imageUrl: string
// ): Promise<void> => {
//   const publicId = getPublicIdFromUrl(imageUrl);

//   return new Promise((resolve, reject) => {
//     cloudinary.uploader.destroy(publicId, (error, result) => {
//       if (error) {
//         // eslint-disable-next-line no-console
//         console.log('Error deleting image from Cloudinary:', error);
//         reject(error);
//       } else {
//         // eslint-disable-next-line no-console
//         console.log('Image deleted from Cloudinary:', result);
//         resolve();
//       }
//     });
//   });
// };

// // Upload image to Cloudinary(A-4)
// export const sendImageToCloudinary = (
//   imageName: string,
//   buffer: Buffer
// ): Promise<Record<string, unknown>> => {

//   return new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(
//       { public_id: imageName.trim() },
//       (error, result) => {
//         if (error) {
//           reject(error);
//         } else {
//           resolve(result as UploadApiResponse);
//         }
//       }
//     );

//     // Create a readable stream from the buffer and pipe it to Cloudinary(A-4)
//     const readableStream = new Readable();
//     readableStream.push(buffer);
//     readableStream.push(null); // Signal end of stream(A-4)
//     readableStream.pipe(uploadStream);
//   });
// };

// // Use memory storage for multer(A-4)
// const storage = multer.memoryStorage(); // Store files in memory instead of disk(A-4)

// const multerUpload = multer({ storage: storage });

// export default multerUpload;

import { v2 as cloudinary, ConfigOptions, UploadApiResponse } from 'cloudinary';
import multer from 'multer';
import config from '../config';
import { Readable } from 'stream';

export type MulterFile = Express.Multer.File;

export const uploadFilesAndInjectUrls = async <
  T extends Record<string, unknown>,
>(
  payload: T,
  files: MulterFile[] = [],
): Promise<T> => {
  const nextPayload = JSON.parse(JSON.stringify(payload)) as T;
  const uploadedUrls: string[] = [];

  const toPathSegments = (fieldname: string) =>
    fieldname
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .map((segment) => segment.trim())
      .filter(Boolean);

  const setNestedValue = (
    target: Record<string, unknown>,
    segments: string[],
    value: string,
  ) => {
    let current: Record<string, unknown> | unknown[] = target;

    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1;
      const nextSegment = segments[index + 1];
      const isIndex = /^\d+$/.test(segment);

      if (isLast) {
        if (Array.isArray(current) && isIndex) {
          current[Number(segment)] = value;
          return;
        }

        (current as Record<string, unknown>)[segment] = value;
        return;
      }

      const shouldBeArray = /^\d+$/.test(nextSegment || '');

      if (Array.isArray(current) && isIndex) {
        if (current[Number(segment)] == null) {
          current[Number(segment)] = shouldBeArray ? [] : {};
        }

        current = current[Number(segment)] as
          | Record<string, unknown>
          | unknown[];
        return;
      }

      const existingValue = (current as Record<string, unknown>)[segment];

      if (existingValue == null || typeof existingValue !== 'object') {
        (current as Record<string, unknown>)[segment] = shouldBeArray ? [] : {};
      }

      current = (current as Record<string, unknown>)[segment] as
        | Record<string, unknown>
        | unknown[];
    });
  };

  try {
    for (const file of files) {
      const { secure_url } = await sendImageToCloudinary(file);
      uploadedUrls.push(secure_url);
      setNestedValue(
        nextPayload as Record<string, unknown>,
        toPathSegments(file.fieldname),
        secure_url,
      );
    }

    return nextPayload;
  } catch (error) {
    await Promise.all(
      uploadedUrls.map((url) => deleteImageFromCloudinary(url)),
    );
    throw error;
  }
};

/* ------------------------------------------------------- */
/*                Cloudinary Configuration                 */
/* ------------------------------------------------------- */

const cloudinaryConfig: ConfigOptions = {
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
};

cloudinary.config(cloudinaryConfig);

/* --------------------------------------------------------- */
/*                    Helper Utils                           */
/* --------------------------- ----------------------------- */

// remove file extension (.png, .jpg etc) and normalize name
const removeExtension = (filename: string): string => {
  return filename
    .split('.')
    .slice(0, -1)
    .join('.')
    .replace(/\s+/g, '-')
    .toLowerCase();
};

// extract publicId (with folder) from cloudinary image url
const getPublicIdFromUrl = (imageUrl: string): string => {
  const url = new URL(imageUrl);
  const parts = url.pathname.split('/');
  const filename = parts.pop() as string;
  const folderPath = parts.slice(-2).join('/'); // uploads/images
  return `${folderPath}/${filename.split('.')[0]}`;
};

/* -------------------------------------------------------- */
/*               Upload Image to Cloudinary                 */
/* -------------------------------------------------------- */

export const sendImageToCloudinary = (
  file: MulterFile,
): Promise<UploadApiResponse> => {
  const uniqueImageName = `${Math.random()
    .toString(36)
    .substring(
      2,
    )}-${Date.now()}-${file.fieldname}-${removeExtension(file.originalname)}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: config.cloudinary_folder_name,
        public_id: uniqueImageName,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result as UploadApiResponse);
        }
      },
    );

    const readableStream = new Readable();
    readableStream.push(file.buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/* -------------------------------------------------------- */
/*              Delete Image from Cloudinary                */
/* -------------------------------------------------------- */

export const deleteImageFromCloudinary = async (
  imageUrl: string,
): Promise<void> => {
  const publicId = getPublicIdFromUrl(imageUrl);

  await cloudinary.uploader.destroy(publicId);
};

/* ------------------------------------------------------- */
/*                       Multer Setup                      */
/* ------------------------------------------------------- */

const storage = multer.memoryStorage();

const multerUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export default multerUpload;
