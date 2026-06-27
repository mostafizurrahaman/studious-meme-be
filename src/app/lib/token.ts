import httpStatus from 'http-status';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import config from '../config';
import { AppError } from '../utils';

type TTokenData = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  dob: Date;
  image: string;
  role: string;
};

export const createAccessToken = (payload: TTokenData): string => {
  const token = jwt.sign(payload, config.jwt.access_secret!, {
    algorithm: 'HS256',
    expiresIn: config.jwt.access_expires_in!,
  } as SignOptions);

  return token;
};

// type TArtistTokenData = {
//   id: string;
//   name: string;
//   phone: string;
//   image: string;
//   email: string;
//   role: string;
// };

// export const createArtistAccessToken = (payload: TArtistTokenData): string => {
//   const token = jwt.sign(payload, config.jwt.access_secret!, {
//     algorithm: 'HS256',
//     expiresIn: config.jwt.access_expires_in!,
//   } as SignOptions);

//   return token;
// };

export const createRefreshToken = (payload: { email: string }): string => {
  const token = jwt.sign(payload, config.jwt.refresh_secret!, {
    algorithm: 'HS256',
    expiresIn: config.jwt.refresh_expires_in!,
  } as SignOptions);

  return token;
};

export interface ITokenUser {
  id: string;
  name: string;
  image: string;
  email: string;
  role: string;
}

export const verifyToken = (token: string, secret: Secret) => {
  try {
    const decoded = jwt.verify(token, secret) as ITokenUser;

    return decoded;
  } catch {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Unauthorized access!');
  }
};
