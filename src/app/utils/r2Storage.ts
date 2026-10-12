import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import config from '../config';

export type MulterFileLike = {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
  fieldname?: string;
  size?: number;
};

export interface R2UploadResult {
  secure_url: string;
  url: string;
  key: string;
  bucket: string;
  mimetype?: string;
  size?: number;
}

let r2ClientInstance: S3Client | null = null;

/**
 * Returns a singleton instance of the AWS S3Client configured for Cloudflare R2
 */
export const getR2Client = (): S3Client => {
  if (r2ClientInstance) {
    return r2ClientInstance;
  }

  const { accountId, accessKeyId, secretAccessKey, endpoint } =
    config.cloudflareR2;

  const resolvedEndpoint =
    endpoint ||
    (accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : undefined);

  if (!resolvedEndpoint || !accessKeyId || !secretAccessKey) {
    // eslint-disable-next-line no-console
    console.warn(
      '[Cloudflare R2] Warning: R2 credentials or endpoint not fully configured in environment variables.',
    );
  }

  r2ClientInstance = new S3Client({
    region: 'auto',
    endpoint: resolvedEndpoint,
    credentials: {
      accessKeyId: accessKeyId || '',
      secretAccessKey: secretAccessKey || '',
    },
  });

  return r2ClientInstance;
};

/**
 * Normalizes file name by removing extension and cleaning special chars
 */
export const cleanFileName = (filename: string): string => {
  return filename
    .split('.')
    .slice(0, -1)
    .join('.')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
};

/**
 * Extracts the file extension (with leading dot) or returns default
 */
export const getFileExtension = (
  filename?: string,
  mimetype?: string,
): string => {
  if (filename && filename.includes('.')) {
    return `.${filename.split('.').pop()?.toLowerCase() || 'jpg'}`;
  }
  if (mimetype) {
    const ext = mimetype.split('/')[1];
    return ext ? `.${ext.replace('+xml', '')}` : '.jpg';
  }
  return '.jpg';
};

/**
 * Generates a unique R2 object key
 */
export const generateR2Key = (
  file: MulterFileLike,
  customFolder?: string,
): string => {
  const folder = (customFolder || 'uploads')
    .replace(/^\/+|\/+$/g, '')
    .trim();

  const originalBase = file.originalname
    ? cleanFileName(file.originalname)
    : 'image';
  const fieldName = file.fieldname ? `${file.fieldname}-` : '';
  const randomStr = Math.random().toString(36).substring(2, 9);
  const timestamp = Date.now();
  const ext = getFileExtension(file.originalname, file.mimetype);

  const fileName = `${randomStr}-${timestamp}-${fieldName}${originalBase}${ext}`;

  return folder ? `${folder}/${fileName}` : fileName;
};

/**
 * Extracts the object key from a Cloudflare R2 URL or raw key string
 */
export const extractR2KeyFromUrl = (urlOrKey: string): string => {
  if (!urlOrKey || typeof urlOrKey !== 'string') {
    return '';
  }

  const trimmed = urlOrKey.trim();

  // If already a key without protocol
  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^\/+/, '');
  }

  try {
    const parsed = new URL(trimmed);
    let pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
    const bucketName = config.cloudflareR2.bucketName;

    // Only strip bucketName if hostname is an S3 API endpoint (e.g. endpoint/bucket/key)
    if (
      bucketName &&
      (parsed.hostname.includes('r2.cloudflarestorage.com') ||
        parsed.hostname.includes('amazonaws.com')) &&
      pathname.startsWith(`${bucketName}/`)
    ) {
      pathname = pathname.substring(bucketName.length + 1);
    }

    return pathname;
  } catch {
    return trimmed.replace(/^\/+/, '');
  }
};

/**
 * Builds public URL for an R2 key based on configuration
 */
export const getR2PublicUrl = (key: string): string => {
  const cleanKey = key.replace(/^\/+/, '');
  const { publicUrl, bucketName, accountId } = config.cloudflareR2;

  if (publicUrl) {
    const normalizedPublic = publicUrl.replace(/\/+$/, '');
    return `${normalizedPublic}/${cleanKey}`;
  }

  if (accountId && bucketName) {
    return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${cleanKey}`;
  }

  return `/${cleanKey}`;
};

/**
 * Upload an image or file buffer to Cloudflare R2
 */
export const uploadImageToR2 = async (
  file: MulterFileLike,
  options?: { folder?: string; contentType?: string },
): Promise<R2UploadResult> => {
  const s3 = getR2Client();
  const bucket = config.cloudflareR2.bucketName;

  if (!bucket) {
    throw new Error(
      'CLOUDFLARE_R2_BUCKET_NAME is not configured in environment variables.',
    );
  }

  const key = generateR2Key(file, options?.folder);
  const contentType =
    options?.contentType || file.mimetype || 'image/jpeg';

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: contentType,
  });

  await s3.send(command);

  const publicUrl = getR2PublicUrl(key);

  return {
    secure_url: publicUrl,
    url: publicUrl,
    key,
    bucket,
    mimetype: contentType,
    size: file.size || file.buffer.length,
  };
};

/**
 * Purges cache from Cloudflare Edge CDN for specific URLs
 */
export const purgeCloudflareCache = async (
  urls: string[],
): Promise<boolean> => {
  const { zoneId, apiToken } = config.cloudflareR2;

  if (!zoneId || !apiToken) {
    return false;
  }

  const validUrls = urls.filter((url) => /^https?:\/\//i.test(url));
  if (validUrls.length === 0) {
    return false;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: validUrls }),
      },
    );

    const data = (await response.json()) as { success?: boolean; errors?: unknown };
    if (data.success) {
      // eslint-disable-next-line no-console
      console.log(`[Cloudflare CDN] Successfully purged cache for:`, validUrls);
      return true;
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[Cloudflare CDN] Failed to purge cache:`, data.errors);
      return false;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[Cloudflare CDN] Error purging cache:`, error);
    return false;
  }
};

/**
 * Delete an object from Cloudflare R2 given its public URL or object key
 * and automatically purges the CDN cache
 */
export const deleteImageFromR2 = async (urlOrKey: string): Promise<boolean> => {
  const key = extractR2KeyFromUrl(urlOrKey);

  if (!key) {
    return false;
  }

  const s3 = getR2Client();
  const bucket = config.cloudflareR2.bucketName;

  if (!bucket) {
    // eslint-disable-next-line no-console
    console.warn(
      '[Cloudflare R2] Deletion skipped: CLOUDFLARE_R2_BUCKET_NAME is not configured.',
    );
    return false;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3.send(command);
    // eslint-disable-next-line no-console
    console.log(`[Cloudflare R2] Successfully deleted object key: ${key}`);

    // Determine the public URL and purge Cloudflare Edge CDN cache immediately
    const publicUrl = /^https?:\/\//i.test(urlOrKey)
      ? urlOrKey
      : getR2PublicUrl(key);

    void purgeCloudflareCache([publicUrl]);

    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[Cloudflare R2] Error deleting object key "${key}":`, error);
    throw error;
  }
};
