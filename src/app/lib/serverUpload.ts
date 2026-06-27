import multer from 'multer';
import path from 'path';
// import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils';
import httpStatus from 'http-status';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (_req, file, callback) => {
    let folderPath: string;

    if (file.mimetype.startsWith('image')) {
      folderPath = './public/images';
    } else if (file.mimetype.startsWith('video')) {
      folderPath = './public/videos';
    } else {
      callback(
        new AppError(
          httpStatus.BAD_REQUEST,
          'Only images and videos are allowed',
        ),
        './public',
      );
      return;
    }

    // Check if the folder exists, if not, create it
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    callback(null, folderPath);
  },

  filename(_req, file, callback) {
    const fileExt = path.extname(file.originalname);
    const fileName = `${file.originalname
      .replace(fileExt, '')
      .toLocaleLowerCase()
      .split(' ')
      .join('-')}-${Date.now()}`;
    // .join('-')}-${uuidv4()}`;

    callback(null, fileName + fileExt);
  },
});

const serverUpload = multer({ storage });

export default serverUpload;
