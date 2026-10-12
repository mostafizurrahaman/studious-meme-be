import { describe, expect, it } from 'vitest';
import {
  extractCloudinaryPublicId,
  identifyImageStorageProvider,
  isCloudflareR2Url,
  isCloudinaryUrl,
} from './imageStorage';
import {
  cleanFileName,
  extractR2KeyFromUrl,
  generateR2Key,
  getFileExtension,
} from './r2Storage';

describe('Cloudflare R2 and Image Storage Utils', () => {
  describe('Provider Identification', () => {
    it('should identify Cloudinary URLs correctly', () => {
      const url1 =
        'https://res.cloudinary.com/dweesppci/image/upload/v1746204369/wtmpcphfvexcq2ubcss0.png';
      const url2 =
        'http://res.cloudinary.com/demo/image/upload/sample.jpg';

      expect(isCloudinaryUrl(url1)).toBe(true);
      expect(isCloudinaryUrl(url2)).toBe(true);
      expect(identifyImageStorageProvider(url1)).toBe('cloudinary');
      expect(identifyImageStorageProvider(url2)).toBe('cloudinary');
    });

    it('should identify Cloudflare R2 URLs correctly', () => {
      const devUrl =
        'https://pub-a1b2c3d4e5.r2.dev/malamal/images/product-12345.png';
      const s3ApiUrl =
        'https://0123456789abcdef.r2.cloudflarestorage.com/malamal-bucket/images/hero.webp';

      expect(isCloudflareR2Url(devUrl)).toBe(true);
      expect(isCloudflareR2Url(s3ApiUrl)).toBe(true);
      expect(identifyImageStorageProvider(devUrl)).toBe('cloudflare_r2');
      expect(identifyImageStorageProvider(s3ApiUrl)).toBe('cloudflare_r2');
    });

    it('should return unknown for non-storage links or invalid inputs', () => {
      expect(isCloudinaryUrl('https://example.com/image.png')).toBe(false);
      expect(isCloudflareR2Url('https://example.com/image.png')).toBe(false);
      expect(identifyImageStorageProvider('https://example.com/image.png')).toBe(
        'unknown',
      );
      expect(identifyImageStorageProvider('')).toBe('unknown');
    });
  });

  describe('Cloudinary Public ID Extraction', () => {
    it('should extract public ID with folder and without extension', () => {
      const urlWithVersion =
        'https://res.cloudinary.com/dweesppci/image/upload/v1746204369/malamal/images/wtmpcphfvexcq2ubcss0.png';
      expect(extractCloudinaryPublicId(urlWithVersion)).toBe(
        'malamal/images/wtmpcphfvexcq2ubcss0',
      );

      const urlWithoutVersion =
        'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      expect(extractCloudinaryPublicId(urlWithoutVersion)).toBe('sample');
    });
  });

  describe('R2 Key Extraction & Helpers', () => {
    it('should extract R2 object key from public dev URLs', () => {
      const url =
        'https://pub-a1b2c3d4e5.r2.dev/malamal/images/item-123.jpg';
      expect(extractR2KeyFromUrl(url)).toBe('malamal/images/item-123.jpg');
    });

    it('should extract R2 object key from raw key strings', () => {
      expect(extractR2KeyFromUrl('malamal/images/banner.png')).toBe(
        'malamal/images/banner.png',
      );
      expect(extractR2KeyFromUrl('/malamal/images/banner.png')).toBe(
        'malamal/images/banner.png',
      );
    });

    it('should clean file names properly', () => {
      expect(cleanFileName('My Super Product Image!.png')).toBe(
        'my-super-product-image-',
      );
    });

    it('should determine correct file extensions', () => {
      expect(getFileExtension('photo.png')).toBe('.png');
      expect(getFileExtension(undefined, 'image/webp')).toBe('.webp');
      expect(getFileExtension(undefined, undefined)).toBe('.jpg');
    });

    it('should generate properly structured unique R2 keys', () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test-image.jpg',
        fieldname: 'avatar',
      };

      const key = generateR2Key(mockFile, 'test-folder');
      expect(key.startsWith('test-folder/')).toBe(true);
      expect(key.endsWith('.jpg')).toBe(true);
      expect(key.includes('avatar-')).toBe(true);
    });

    it('should generate keys using module constants correctly', () => {
      const mockFile = {
        buffer: Buffer.from('product-data'),
        originalname: 'drill-machine.png',
      };

      const productKey = generateR2Key(mockFile, 'products');
      expect(productKey.startsWith('products/')).toBe(true);
      expect(productKey.endsWith('.png')).toBe(true);
      expect(productKey.includes('drill-machine')).toBe(true);
    });
  });
});
