import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './app/routes';
import { globalErrorHandler, notFoundHandler } from './app/utils';
import os from 'os';
import path from 'path';
import config from './app/config';
import serverHomePage, { getMonitorStats } from './app/helpers/serverHomePage';
import { globalLimiter } from './app/middlewares';
// import { migrateOldImagesToCloudinary } from './app/scripts/migrateOldImagesToCloudinary';
import { responseTimeLogger } from './app/middlewares/logger';

const app: Application = express();

app.set('trust proxy', 1);

// Security headers with Helmet
const isProduction = process.env.NODE_ENV === 'production';
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },

    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],

        scriptSrcAttr: ["'unsafe-inline'"],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdnjs.cloudflare.com',
          'https://fonts.googleapis.com',
        ],

        styleSrcAttr: ["'unsafe-inline'"],

        imgSrc: ["'self'", 'data:'],

        connectSrc: [
          "'self'",
          // 'http://localhost:3000',
          // 'http://localhost:3001',
          // 'http://localhost:3002',
          // 'http://localhost:5173',
          // 'https://*.vercel.app',
          // 'https://malamal.com.bd',
          // 'https://www.malamal.com.bd',
          // 'https://www.google-analytics.com',
          // 'https://www.googletagmanager.com',
        ],

        fontSrc: [
          "'self'",
          'data:',
          'https://cdnjs.cloudflare.com',
          'https://fonts.gstatic.com',
        ],

        frameSrc: ["'none'"], // ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com']

        mediaSrc: ["'none'"], // ["'self'", 'https:', 'blob:'],

        objectSrc: ["'none'"],

        baseUri: ["'self'"],

        formAction: ["'none'"],
        // formAction: [
        //   "'self'",
        //   'https://malamal.com.bd',
        //   'https://www.malamal.com.bd',
        // ],

        ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },

    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
  }),
);

// (3)
// response time logger
app.use(responseTimeLogger);

// CORS configuration
app.use(
  cors({
    credentials: true,
    origin: config.allowed_origins.length
      ? config.allowed_origins
      : ['http://localhost:3000'],
  }),
);

// all parsers
// cookie parser
app.use(cookieParser());

// logger
app.use(morgan('dev'));

// json parser
app.use(express.json({ limit: '10mb' }));

// form data parser
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// global rate limiting
app.use(globalLimiter);

// for static files
// app.use('/public', express.static('public'));

// for static files
app.use('/public', express.static('public'));

// favicon route
app.get('/favicon.ico', (_req: Request, res: Response) => {
  const faviconPath = path.join(
    process.cwd(),
    'src',
    'app',
    'utils',
    'assets',
    'icon.png',
  );
  res.sendFile(faviconPath, (err) => {
    if (err) {
      res.sendStatus(404);
    }
  });
});

// all main routes
app.use('/api/v1', routes);

// Testing
app.get('/', (req: Request, res: Response) => {
  res.send({
    success: true,
    message: 'Server is running like a Rabit!',
    time: new Date().toISOString(),
  });
});

app.get('/info', (req: Request, res: Response) => {
  const currentDateTime = new Date().toISOString();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const serverHostname = os.hostname();
  const serverPlatform = os.platform();
  const serverUptime = os.uptime();
  res.send({
    success: true,
    message: `Welcome to ${config.preffered_website_name} Server`,
    version: '1.0.0',
    clientDetails: {
      ipAddress: clientIp,
      accessedAt: currentDateTime,
    },
    serverDetails: {
      hostname: serverHostname,
      platform: serverPlatform,
      uptime: `${Math.floor(serverUptime / 60 / 60)} hours ${Math.floor((serverUptime / 60) % 60)} minutes`,
    },
    developerContact: {
      name: 'Khaled Siddique',
      email: 'khaledssbd@gmail.com',
      website: 'https://khaled-siddique.vercel.app',
    },
  });
});

app.get('/monitor', async (req: Request, res: Response) => {
  const htmlContent = await serverHomePage();
  res.send(htmlContent);
});

app.get('/monitor/data', (req: Request, res: Response) => {
  const data = getMonitorStats();
  res.json(data);
});

// Temporary migration hook. Remove after WordPress image URLs are migrated.
// if (process.env.NODE_ENV !== 'test') {
//   void migrateOldImagesToCloudinary();
// }

// global error handler
app.use(globalErrorHandler);

// all not found handler
app.use(notFoundHandler);

export default app;
