/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// (1)
const logsDir = path.join(process.cwd(), 'logs');
const responseLogFilePath = path.join(logsDir, 'ResponseTime.log');
const errorLogFilePath = path.join(logsDir, 'Error.log');

// Ensure logs directory and files exist on startup
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
if (!fs.existsSync(responseLogFilePath)) {
  fs.writeFileSync(responseLogFilePath, '', 'utf8');
}
if (!fs.existsSync(errorLogFilePath)) {
  fs.writeFileSync(errorLogFilePath, '', 'utf8');
}

/**
 * Middleware to log response times to ResponseTime.log
 */
export const responseTimeLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  if (
    req.originalUrl === '/' ||
    req.originalUrl === '/api/v1/health' ||
    req.originalUrl === '/monitor' ||
    req.originalUrl === '/monitor/data'
  ) {
    return next();
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      responseTime: duration,
    };

    fs.appendFile(
      responseLogFilePath,
      JSON.stringify(logEntry) + '\n',
      (err) => {
        if (err) {
          console.error('Failed to write to ResponseTime.log:', err);
        }
      },
    );
  });

  next();
};

/**
 * Utility to log errors to Error.log
 */
export const errorLogger = (err: any, req: Request, statusCode: number) => {
  const logEntry = {
    level: 'error',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    status: statusCode,
    message: err.message || 'Internal Server Error',
    stack: err.stack || '',
  };

  fs.appendFile(
    errorLogFilePath,
    '\n' + JSON.stringify(logEntry) + '\n',
    (err) => {
      if (err) {
        console.error('Failed to write to Error.log:', err);
      }
    },
  );
};
