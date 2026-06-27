import { Response } from 'express';

export type TMeta = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

type TResponse<T> = {
  statusCode: number;
  message?: string;
  meta?: TMeta;
  data: T;
  [key: string]: unknown;
};

const sendResponse = <T>(res: Response, responseData: TResponse<T>) => {
  const { statusCode, message, meta, data, ...rest } = responseData;

  res.status(statusCode).json({
    success: true,
    // statusCode
    message,
    meta,
    data,
    ...rest,
  });
};

export default sendResponse;
