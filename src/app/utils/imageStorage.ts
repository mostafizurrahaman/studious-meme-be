import { v2 as cloudinary, ConfigOptions } from 'cloudinary';
import config from '../config';
import {
  deleteImageFromR2,
  extractR2KeyFromUrl,
  MulterFileLike,
  R2UploadResult,
  uploadImageToR2,
} from './r2Storage';

export type StorageProvider = 'cloudinary' | 'cloudflare_r2' | 'unknown';

export interface StorageDeleteResult {
  success: boolean;
  provider: StorageProvider | 'skipped';
  message?: string;
}

/* ------------------------------------------------------- */
/*                Cloudinary Configuration                 */
/* ------------------------------------------------------- */

const cloudinaryConfig: ConfigOptions = {
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
};

cloudinary.config(cloudinaryConfig);

/* ------------------------------------------------------- */
/*                 URL Identification Utils                */
/* ------------------------------------------------------- */

/**
 * Checks whether a URL belongs to Cloudinary
 */
export const isCloudinaryUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  return (
    /^https?:\/\/res\.cloudinary\.com\//i.test(url) ||
    /cloudinary\.com/i.test(url)
  );
};

/**
 * Checks whether a URL belongs to Cloudflare R2
 */
export const isCloudflareR2Url = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim();

  // Standard R2 dev domains, S3 API endpoint, or cloudflare storage
  if (
    /\.r2\.dev(\/|$)/i.test(trimmed) ||
    /\.r2\.cloudflarestorage\.com(\/|$)/i.test(trimmed) ||
    /r2\.cloudflarestorage/i.test(trimmed)
  ) {
    return true;
  }

  // Check against custom configured public URL if specified
  if (config.cloudflareR2.publicUrl) {
    try {
      const configuredHost = new URL(config.cloudflareR2.publicUrl).host;
      if (trimmed.includes(configuredHost)) {
        return true;
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  // Check against custom endpoint host if configured
  if (config.cloudflareR2.endpoint) {
    try {
      const endpointHost = new URL(config.cloudflareR2.endpoint).host;
      if (trimmed.includes(endpointHost)) {
        return true;
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  return false;
};

/**
 * Identifies the storage provider (Cloudinary vs Cloudflare R2) from an image URL
 */
export const identifyImageStorageProvider = (
  imageUrl: string,
): StorageProvider => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return 'unknown';
  }

  if (isCloudinaryUrl(imageUrl)) {
    return 'cloudinary';
  }

  if (isCloudflareR2Url(imageUrl)) {
    return 'cloudflare_r2';
  }

  return 'unknown';
};

/* ------------------------------------------------------- */
/*               Cloudinary Extraction & Delete            */
/* ------------------------------------------------------- */

/**
 * Extracts publicId (including folder path) from a Cloudinary image URL
 */
export const extractCloudinaryPublicId = (imageUrl: string): string => {
  if (!imageUrl || typeof imageUrl !== 'string') return '';

  try {
    const url = new URL(imageUrl);
    const pathname = decodeURIComponent(url.pathname);

    // Format: /<cloud_name>/image/upload/(transforms/)?(v<version>/)?<public_id>.<ext>
    const uploadMatch = pathname.match(
      /\/image\/upload\/(?:[a-zA-Z0-9_,]+(?:\/))?(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/,
    );

    if (uploadMatch && uploadMatch[1]) {
      return uploadMatch[1];
    }

    // Fallback: extract last segment or folder/filename
    const parts = pathname.split('/');
    const filename = parts.pop() || '';
    const cleanFilename = filename.split('.')[0];
    const folder = parts.slice(-2).join('/');
    return folder ? `${folder}/${cleanFilename}` : cleanFilename;
  } catch {
    // If not a valid URL, treat as publicId directly
    return imageUrl.replace(/\.[^/.]+$/, '');
  }
};

/**
 * Deletes an image from Cloudinary
 */
export const deleteFromCloudinary = async (
  imageUrlOrPublicId: string,
): Promise<boolean> => {
  const publicId = extractCloudinaryPublicId(imageUrlOrPublicId);

  if (!publicId) {
    return false;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    // eslint-disable-next-line no-console
    console.log(
      `[Cloudinary] Image deleted: "${publicId}", result:`,
      result.result,
    );
    return result.result === 'ok';
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `[Cloudinary] Error deleting image with publicId "${publicId}":`,
      error,
    );
    throw error;
  }
};

/* ------------------------------------------------------- */
/*           Unified Image Deletion by URL Handler         */
/* ------------------------------------------------------- */

/**
 * Detects whether the URL is a protected default/system image or placeholder
 */
const isDefaultOrProtectedImage = (imageUrl: string): boolean => {
  // Add known default avatars or placeholder URLs here
  const protectedPatterns = [
    'wtmpcphfvexcq2ubcss0', // defaultUserImage
    'default-avatar',
    'placeholder',
  ];

  return protectedPatterns.some((pattern) => imageUrl.includes(pattern));
};

/**
 * Automatically identifies whether an image link belongs to Cloudinary or Cloudflare R2
 * and deletes the image from the appropriate storage provider.
 *
 * @param imageUrl The full image URL or storage key
 */
export const deleteImageByUrl = async (
  imageUrl: string,
): Promise<StorageDeleteResult> => {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return {
      success: true,
      provider: 'skipped',
      message: 'Empty or missing image URL provided',
    };
  }

  const cleanUrl = imageUrl.trim();

  // Protect default images from accidental deletion
  if (isDefaultOrProtectedImage(cleanUrl)) {
    // eslint-disable-next-line no-console
    console.log(
      `[Storage] Skipped deletion for protected/default image: ${cleanUrl}`,
    );
    return {
      success: true,
      provider: 'skipped',
      message: 'Protected default image preserved',
    };
  }

  const provider = identifyImageStorageProvider(cleanUrl);

  try {
    switch (provider) {
      case 'cloudinary': {
        await deleteFromCloudinary(cleanUrl);
        return {
          success: true,
          provider: 'cloudinary',
          message: 'Image deleted from Cloudinary',
        };
      }

      case 'cloudflare_r2': {
        await deleteImageFromR2(cleanUrl);
        return {
          success: true,
          provider: 'cloudflare_r2',
          message: 'Image deleted from Cloudflare R2',
        };
      }

      case 'unknown':
      default: {
        // eslint-disable-next-line no-console
        console.warn(
          `[Storage] Unknown storage provider for URL: "${cleanUrl}". Attempting fallback R2 key extraction if applicable.`,
        );

        // If it looks like an R2 key or path without domain
        if (!cleanUrl.startsWith('http')) {
          await deleteImageFromR2(cleanUrl);
          return {
            success: true,
            provider: 'cloudflare_r2',
            message: 'Image deleted from Cloudflare R2 via key',
          };
        }

        return {
          success: false,
          provider: 'unknown',
          message: `Unable to determine storage provider for image URL: ${cleanUrl}`,
        };
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `[Storage] Failed to delete image (${provider}): ${cleanUrl}`,
      error,
    );
    throw error;
  }
};

/**
 * Helper to delete multiple image URLs in parallel, skipping null/empty items safely
 */
export const deleteMultipleImagesByUrls = async (
  imageUrls: (string | null | undefined)[],
): Promise<StorageDeleteResult[]> => {
  const validUrls = imageUrls.filter(
    (url): url is string => Boolean(url && typeof url === 'string' && url.trim()),
  );

  return Promise.all(validUrls.map((url) => deleteImageByUrl(url)));
};

/* ------------------------------------------------------- */
/*                 Unified Storage Upload                  */
/* ------------------------------------------------------- */

export interface StorageUploadResult {
  secure_url: string;
  url: string;
  key?: string;
  provider: 'cloudflare_r2' | 'cloudinary';
  bucket?: string;
}

/**
 * Uploads an image to storage.
 * Defaults to Cloudflare R2 as requested, with fallback option for Cloudinary.
 */
export const uploadImageToStorage = async (
  file: MulterFileLike,
  options?: {
    provider?: 'r2' | 'cloudinary';
    folder?: string;
  },
): Promise<StorageUploadResult> => {
  const provider = options?.provider || 'r2';

  if (provider === 'r2') {
    const r2Result = await uploadImageToR2(file, { folder: options?.folder });
    return {
      secure_url: r2Result.secure_url,
      url: r2Result.url,
      key: r2Result.key,
      bucket: r2Result.bucket,
      provider: 'cloudflare_r2',
    };
  }

  // Fallback to Cloudinary if explicitly requested
  const { sendImageToCloudinary } = await import('../lib/upload');
  const cloudResult = await sendImageToCloudinary(file as Express.Multer.File);
  return {
    secure_url: cloudResult.secure_url,
    url: cloudResult.secure_url,
    provider: 'cloudinary',
  };
};

export {
  deleteImageFromR2,
  extractR2KeyFromUrl,
  uploadImageToR2,
  type MulterFileLike,
  type R2UploadResult,
};
