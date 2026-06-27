/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import { AppError, asyncHandler } from '../utils';
import { ZodObject } from 'zod';
import httpStatus from 'http-status';

// validateRequest
export const validateRequest = (schema: ZodObject<any, any>) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      const parsedData = await schema.parseAsync({
        body: req.body,
        cookies: req.cookies,
        query: req.query,
        params: req.params,
      });

      // Overwrite validated values
      req.body = parsedData.body || req.body;
      req.cookies = parsedData.cookies || req.cookies;

      next();
    },
  );
};

// validateRequestFromFormData
export const validateRequestFromFormData = (schema: ZodObject<any, any>) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      if (req?.body?.data) {
        const parsedData = await schema.parseAsync({
          body: JSON.parse(req?.body?.data),
          cookies: req?.cookies,
          query: req?.query,
          params: req?.params,
        });

        // Overwrite validated values
        req.body = parsedData?.body || req?.body;
        req.cookies = parsedData?.cookies || req?.cookies;

        next();
      } else {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "Hey bro use these values in object format in form-data with name 'data' and type 'text'!",
        );
      }
    },
  );
};
