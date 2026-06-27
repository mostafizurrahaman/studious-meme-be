import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import config from '../config';
import { AppError } from '../utils';

/*
Temporary disable note:
The Redis-backed rate limiting and anti-abuse logic is intentionally kept disabled here.
Do not delete this file; uncomment/reinstate the real implementation later when requested.

Disabled pieces:
- global/public/auth/action/admin/payment rate limiters
- burst protection
- duplicate submission guard
- payment webhook IP allowlist guard (kept available, but not tied to rate limiting)
*/

export const globalLimiter = (...args: [Request, Response, NextFunction]) =>
  args[2]();
export const publicLimiter = (...args: [Request, Response, NextFunction]) =>
  args[2]();
export const authLimiter = (...args: [Request, Response, NextFunction]) =>
  args[2]();
export const actionLimiter = (...args: [Request, Response, NextFunction]) =>
  args[2]();
export const adminLimiter = (...args: [Request, Response, NextFunction]) =>
  args[2]();
export const paymentLimiter = (...args: [Request, Response, NextFunction]) =>
  args[2]();

export const duplicateSubmissionGuard =
  (_windowMs?: number) =>
  (...args: [Request, Response, NextFunction]) => {
    void _windowMs;
    return args[2]();
  };
export const burstProtection =
  (_scope?: string, _windowMs?: number, _maxBursts?: number) =>
  (...args: [Request, Response, NextFunction]) => {
    void _scope;
    void _windowMs;
    void _maxBursts;
    return args[2]();
  };

const normalizeIp = (value: string) => value.replace(/^::ffff:/, '').trim();

const getClientIp = (req: Request) => {
  const forwarded = req.headers['x-forwarded-for'];
  const headerIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;

  return normalizeIp(
    headerIp
      ? String(headerIp).split(',')[0]
      : req.ip || req.socket.remoteAddress || 'unknown',
  );
};

export const paymentWebhookGuard = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (req.method !== 'POST') {
    next(
      new AppError(
        httpStatus.METHOD_NOT_ALLOWED,
        'Webhook method not allowed.',
      ),
    );
    return;
  }

  const allowlist = config.portpos.webhook_ip_allowlist
    ? config.portpos.webhook_ip_allowlist
        .split(',')
        .map((ip) => normalizeIp(ip))
    : [];

  if (allowlist.length > 0) {
    const clientIp = getClientIp(req);

    if (!allowlist.includes(clientIp)) {
      next(
        new AppError(httpStatus.FORBIDDEN, 'Webhook source is not allowed.'),
      );
      return;
    }
  }

  next();
};

// import { createHash } from 'crypto';
// import { type NextFunction, type Request, type Response } from 'express';
// import rateLimit from 'express-rate-limit';
// import { RedisStore } from 'rate-limit-redis';
// import { createClient, type RedisClientType } from 'redis';
// import httpStatus from 'http-status';
// import config from '../config';
// import AppError from '../utils/AppError';

// type RateScope = 'global' | 'public' | 'auth' | 'action' | 'admin' | 'payment';

// const redisClientFactory = (() => {
//     let client: RedisClientType | null = null;
//     let connectPromise: Promise<unknown> | null = null;

//     return () => {
//         if (!config.redis.url) {
//             return null;
//         }

//         if (!client) {
//             client = createClient({ url: config.redis.url });
//             client.on('error', error => {
//                 process.stderr.write(`Redis error: ${String(error)}\n`);
//             });
//         }

//         if (!connectPromise) {
//             connectPromise = client.connect().catch(error => {
//                 connectPromise = null;
//                 process.stderr.write(`Redis connect error: ${String(error)}\n`);
//             });
//         }

//         return client;
//     };
// })();

// const redisClient = redisClientFactory();

// const redisStore = redisClient
//     ? new RedisStore({
//           sendCommand: (...args: string[]) => redisClient.sendCommand(args),
//           prefix: config.redis.rateLimitPrefix,
//       })
//     : undefined;

// const SUSPICIOUS_UA_PATTERNS = [
//     /\bbot\b/i,
//     /crawler/i,
//     /spider/i,
//     /curl/i,
//     /wget/i,
//     /python-requests/i,
//     /axios/i,
//     /postman/i,
//     /insomnia/i,
//     /httpclient/i,
//     /libwww-perl/i,
// ];

// const getHeaderValue = (value: string | string[] | undefined) => {
//     if (Array.isArray(value)) {
//         return value[0] ?? '';
//     }

//     return value ?? '';
// };

// const normalizeIp = (value: string) => value.replace(/^::ffff:/, '');

// const stripQuotes = (value: string) => value.replace(/^['"]|['"]$/g, '');

// const getUserAgent = (req: Request) => getHeaderValue(req.headers['user-agent']).trim();

// const isSuspiciousUserAgent = (userAgent: string) => {
//     if (!userAgent) {
//         return true;
//     }

//     return SUSPICIOUS_UA_PATTERNS.some(pattern => pattern.test(userAgent));
// };

// const getClientIdentity = (req: Request) => {
//     const userId = req.user?._id ? String(req.user._id) : '';

//     if (userId) {
//         return `user:${userId}`;
//     }

//     const forwardedFor = getHeaderValue(req.headers['x-forwarded-for']).split(',')[0]?.trim();
//     const ipAddress = normalizeIp(forwardedFor || req.ip || req.socket.remoteAddress || 'unknown');

//     return `ip:${ipAddress}`;
// };

// const getRequestFingerprint = (req: Request) => {
//     const body = req.body && typeof req.body === 'object' ? req.body : {};
//     const payload = {
//         method: req.method,
//         path: req.originalUrl.split('?')[0],
//         client: getClientIdentity(req),
//         body,
//     };

//     return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
// };

// const getAdaptiveLimit = (baseLimit: number, req: Request) => {
//     if (!isSuspiciousUserAgent(getUserAgent(req))) {
//         return baseLimit;
//     }

//     return Math.max(config.rateLimit.botPenaltyFloor, Math.floor(baseLimit / 5));
// };

// const getLimiterStore = () => {
//     if (!redisStore) {
//         throw new Error('REDIS_URL is required for production rate limiting.');
//     }

//     return redisStore;
// };

// const createLimiter = (scope: RateScope, windowMs: number, maxRequests: number) =>
//     rateLimit({
//         windowMs,
//         limit: req => getAdaptiveLimit(maxRequests, req),
//         standardHeaders: 'draft-7',
//         legacyHeaders: false,
//         skip: req => req.method === 'OPTIONS',
//         keyGenerator: req => `${scope}:${getClientIdentity(req)}`,
//         store: getLimiterStore(),
//         handler: (_req, _res, next) => {
//             next(new AppError(httpStatus.TOO_MANY_REQUESTS, 'Too many requests, please try again later.'));
//         },
//     });

// const redisSafe = () => {
//     if (!redisClient) {
//         throw new Error('REDIS_URL is required for request protection.');
//     }

//     return redisClient;
// };

// const duplicateKey = (req: Request) => `dedup:${getRequestFingerprint(req)}`;
// const burstKey = (req: Request, scope: RateScope) => `burst:${scope}:${getClientIdentity(req)}`;

// const blockUntilTtlExpiry = (value: unknown) => {
//     const ttl = Number(value);
//     return Number.isFinite(ttl) ? ttl : 0;
// };

// export const globalLimiter = createLimiter(
//     'global',
//     config.rateLimit.globalWindowMs,
//     config.rateLimit.globalMax,
// );
// export const publicLimiter = createLimiter(
//     'public',
//     config.rateLimit.publicWindowMs,
//     config.rateLimit.publicMax,
// );
// export const authLimiter = createLimiter('auth', config.rateLimit.authWindowMs, config.rateLimit.authMax);
// export const actionLimiter = createLimiter(
//     'action',
//     config.rateLimit.actionWindowMs,
//     config.rateLimit.actionMax,
// );
// export const adminLimiter = createLimiter('admin', config.rateLimit.adminWindowMs, config.rateLimit.adminMax);
// export const paymentLimiter = createLimiter(
//     'payment',
//     config.rateLimit.paymentWindowMs,
//     config.rateLimit.paymentMax,
// );

// export const duplicateSubmissionGuard = (windowMs = config.rateLimit.duplicateWindowMs) => {
//     return async (req: Request, _res: Response, next: NextFunction) => {
//         try {
//             const client = redisSafe();
//             const key = duplicateKey(req);
//             const result = await client.set(key, '1', { NX: true, PX: windowMs });

//             if (result !== 'OK') {
//                 next(
//                     new AppError(
//                         httpStatus.CONFLICT,
//                         'Duplicate request detected. Please wait a moment before retrying.',
//                     ),
//                 );
//                 return;
//             }

//             next();
//         } catch (error) {
//             next(error);
//         }
//     };
// };

// export const burstProtection = (scope: RateScope, windowMs = 10_000, maxBursts = 12) => {
//     return async (req: Request, _res: Response, next: NextFunction) => {
//         try {
//             const client = redisSafe();
//             const key = burstKey(req, scope);
//             const ttlMs = String(windowMs);

//             const script = `
//                 local current = redis.call('INCR', KEYS[1])
//                 if current == 1 then
//                     redis.call('PEXPIRE', KEYS[1], ARGV[1])
//                 end
//                 local ttl = redis.call('PTTL', KEYS[1])
//                 return { current, ttl }
//             `;

//             const result = (await client.eval(script, {
//                 keys: [key],
//                 arguments: [ttlMs],
//             })) as [number | string, number | string];

//             const count = Number(result[0]);
//             const ttl = blockUntilTtlExpiry(result[1]);

//             if (count > maxBursts) {
//                 if (ttl > 0) {
//                     // keep current TTL; no-op
//                 }

//                 next(
//                     new AppError(
//                         httpStatus.TOO_MANY_REQUESTS,
//                         'Burst activity detected. Please slow down and retry.',
//                     ),
//                 );
//                 return;
//             }

//             next();
//         } catch (error) {
//             next(error);
//         }
//     };
// };
