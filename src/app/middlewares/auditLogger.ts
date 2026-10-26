import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { verifyToken } from '../lib';
import config from '../config';
import { AuditLogService } from '../modules/AuditLog/auditLog.service';
import {
  IAuditLog,
  TAuditAction,
  TAuditModule,
} from '../modules/AuditLog/auditLog.interface';

// Helper to sanitize sensitive fields from logged payloads
const sanitizeDetails = (data: unknown): Record<string, any> | undefined => {
  if (!data || typeof data !== 'object') return undefined;

  const sensitiveKeys = new Set([
    'password',
    'oldPassword',
    'newPassword',
    'confirmPassword',
    'token',
    'accessToken',
    'refreshToken',
    'otp',
    'secret',
    'creditCard',
    'cvv',
  ]);

  try {
    const clone = JSON.parse(JSON.stringify(data));
    const cleanObject = (obj: Record<string, any>) => {
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.has(key.toLowerCase())) {
          obj[key] = '[REDACTED]';
        } else if (obj[key] && typeof obj[key] === 'object') {
          cleanObject(obj[key]);
        }
      }
    };
    cleanObject(clone);
    return clone;
  } catch {
    return undefined;
  }
};

// Map URL paths to high-level system modules
export const inferModuleFromPath = (path: string): TAuditModule => {
  const p = path.toLowerCase();
  if (p.includes('/hero')) return 'HERO_SECTION';
  if (p.includes('/product-question') || p.includes('/product-review'))
    return 'PRODUCT';
  if (p.includes('/product')) return 'PRODUCT';
  if (p.includes('/brand')) return 'BRAND';
  if (p.includes('/category')) return 'CATEGORY';
  if (p.includes('/order')) return 'ORDER';
  if (p.includes('/payment')) return 'PAYMENT';
  if (p.includes('/coupon')) return 'COUPON';
  if (p.includes('/admin')) return 'ADMIN';
  if (p.includes('/user')) return 'USER';
  if (p.includes('/page')) return 'PAGE';
  if (p.includes('/auth') || p.includes('/signin')) return 'AUTH';
  return 'SYSTEM';
};

// Map HTTP Method and payload to TAuditAction
export const inferActionFromRequest = (
  method: string,
  path: string,
  body?: Record<string, any>,
): TAuditAction => {
  const p = path.toLowerCase();

  if (p.includes('/reorder')) return 'REORDER';
  if (p.includes('/bulk')) return 'BULK_ACTION';
  if (p.includes('/signin') || p.includes('/login')) return 'LOGIN';

  switch (method.toUpperCase()) {
    case 'POST':
      return 'CREATE';
    case 'PATCH':
    case 'PUT':
      if (
        p.includes('/status') ||
        (body &&
          ('isActive' in body || 'status' in body || 'orderStatus' in body))
      ) {
        return 'STATUS_CHANGE';
      }
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'OTHER';
  }
};

// Generate a human-readable summary for the admin activity
export const generateAuditDescription = (
  userName: string,
  userRole: string,
  action: TAuditAction,
  module: TAuditModule,
  entityId?: string,
): string => {
  const entityPart = entityId ? ` (ID: ${entityId})` : '';
  switch (action) {
    case 'CREATE':
      return `${userName} [${userRole}] created a new entry in ${module}${entityPart}`;
    case 'UPDATE':
      return `${userName} [${userRole}] updated ${module}${entityPart}`;
    case 'DELETE':
      return `${userName} [${userRole}] deleted an item in ${module}${entityPart}`;
    case 'STATUS_CHANGE':
      return `${userName} [${userRole}] changed status in ${module}${entityPart}`;
    case 'REORDER':
      return `${userName} [${userRole}] reordered items in ${module}`;
    case 'BULK_ACTION':
      return `${userName} [${userRole}] performed a bulk action on ${module}`;
    case 'LOGIN':
      return `${userName} [${userRole}] signed into administrative dashboard`;
    default:
      return `${userName} [${userRole}] performed ${action} on ${module}${entityPart}`;
  }
};

// Extract probable entity ID from URL or params
const extractEntityId = (path: string): string | undefined => {
  const segments = path.split('?')[0].split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  const ignoredVerbs = new Set([
    'reorder',
    'bulk',
    'status',
    'change-password',
    'update',
    'delete',
    'create',
    'all',
    'stats',
    'signin',
    'signup',
  ]);
  if (last && !ignoredVerbs.has(last.toLowerCase()) && last.length >= 3) {
    return last;
  }
  return undefined;
};

/**
 * Express Middleware to automatically intercept and record admin audit logs
 */
export const auditLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const method = req.method.toUpperCase();
  const isMutatingMethod = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

  // Hook into response completion
  res.on('finish', () => {
    try {
      const originalPath = req.originalUrl || req.url;

      // Skip logging if reading audit logs themselves or health checks
      if (
        originalPath.includes('/audit-logs') ||
        originalPath.includes('/monitor') ||
        originalPath.includes('/info')
      ) {
        return;
      }

      // 1. Try to get user from req.user (populated by auth middleware)
      let user = (req as any).user;

      // 2. If req.user is missing but an authorization token was sent, decode it
      if (!user && req.headers.authorization) {
        try {
          const token = req.headers.authorization.replace('Bearer ', '');
          if (token && config.jwt.access_secret) {
            const decoded = verifyToken(
              token,
              config.jwt.access_secret,
            ) as JwtPayload;
            if (decoded && decoded.role) {
              user = decoded;
            }
          }
        } catch {
          // Token decode fail: unauthenticated request
        }
      }

      // Only audit actions performed by ADMIN or SUPER_ADMIN
      if (!user || !user.role || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return;
      }

      // Only log mutating actions
      if (!isMutatingMethod) {
        return;
      }

      const inferredModule = inferModuleFromPath(originalPath);
      const inferredAction = inferActionFromRequest(
        method,
        originalPath,
        req.body,
      );
      const entityId = extractEntityId(originalPath);

      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress ||
        req.ip ||
        'unknown';

      const userAgent = (req.headers['user-agent'] as string) || 'unknown';

      const logPayload: Partial<IAuditLog> = {
        user: user._id,
        userName: user.name || 'Admin User',
        userEmail: user.email || 'unknown@admin.com',
        userRole: user.role,
        userImage: user.image || undefined,
        action: inferredAction,
        module: inferredModule,
        description: generateAuditDescription(
          user.name || 'Admin',
          user.role,
          inferredAction,
          inferredModule,
          entityId,
        ),
        entityId,
        method,
        path: originalPath,
        statusCode: res.statusCode,
        ipAddress: clientIp,
        userAgent,
        details: {
          params: req.params,
          query: req.query,
          body: sanitizeDetails(req.body),
        },
        timestamp: new Date(),
      };

      // Non-blocking fire & forget
      void AuditLogService.recordAuditLog(logPayload);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('⚠️ [AuditLogger Middleware] Error capturing audit log:', err);
    }
  });

  next();
};
