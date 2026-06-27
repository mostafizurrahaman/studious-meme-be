import { ZodError, ZodIssue } from 'zod';
import { TErrorSources, TGenericErrorResponse } from '../interface/error';

// zod-validation error handler
const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const statusCode = 400;

  const errorSources: TErrorSources = err.issues.map((issue: ZodIssue) => {
    const last = issue?.path[issue.path.length - 1];
    const normalizedPath =
      typeof last === 'string' || typeof last === 'number'
        ? last
        : String(last);
    return {
      path: normalizedPath,
      message: issue.message,
    };
  });

  return {
    statusCode,
    message: 'Validation Error!',
    errorSources,
  };
};

export default handleZodError;
