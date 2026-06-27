import { MulterFile } from '../lib/upload';

// Type definition for multiple image files mapped by fieldname
export type IImageFiles = Record<string, MulterFile[]>;

// Type definition for a single image file
export interface IImageFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  path: string;
  size: number;
  filename: string;
}
