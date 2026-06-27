import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.join(process.cwd(), '.env'),
  // override: true,
  // debug: true
});

// const envFile = `.env.${process.env.NODE_ENV || '.env'}`;

// dotenv.config({
//     path: path.join(process.cwd(), envFile),
// });

export default {
  NODE_ENV: process.env.NODE_ENV,
  contact_us_email: process.env.CONTACT_US_EMAIL,
  allowed_origins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) =>
        origin.trim().replace(/^['"]|['"]$/g, ''),
      )
    : [],

  port: process.env.PORT,

  db_url: process.env.DB_URL,

  preffered_website_name: process.env.PREFFERED_WEBSITE_NAME,
  cloudinary_folder_name: process.env.CLOUDINARY_FOLDER_NAME,
  emailColor: process.env.EMAIL_COLOR,
  // buttonColor: process.env.BUTTON_COLOR,

  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  otp_expiry_minutes: process.env.OTP_EXPIRY_MINUTES,

  jwt: {
    access_secret: process.env.JWT_ACCESS_SECRET,
    access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
    refresh_secret: process.env.JWT_REFRESH_SECRET,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
    otp_secret: process.env.JWT_OTP_SECRET,
    otp_secret_expires_in: process.env.JWT_OTP_SECRET_EXPIRES_IN,
  },

  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },

  nodemailer: {
    email: process.env.EMAIL_FOR_NODEMAILER,
    password: process.env.PASSWORD_FOR_NODEMAILER,
  },

  superAdmin: {
    name: process.env.SUPER_ADMIN_NAME,
    phone: process.env.SUPER_ADMIN_PHONE,
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    otp: process.env.SUPER_ADMIN_OTP,
    otpExpiry: process.env.SUPER_ADMIN_OTP_EXPIRY,
  },

  monitor: {
    username: process.env.MONITOR_USERNAME,
    password: process.env.MONITOR_PASSWORD,
  },

  portpos: {
    app_key: process.env.PORTPOS_APP_KEY,
    secret_key: process.env.PORTPOS_SECRET_KEY,
    base_url:
      process.env.PORTPOS_BASE_URL ??
      'https://api-sandbox.portpos.com/payment/v2',
    payment_url:
      process.env.PORTPOS_PAYMENT_URL ??
      'https://api-sandbox.portpos.com/payment/v2/invoice',
    redirect_success_url: process.env.PORTPOS_REDIRECT_SUCCESS_URL,
    redirect_fail_url: process.env.PORTPOS_REDIRECT_FAIL_URL,
    redirect_cancel_url: process.env.PORTPOS_REDIRECT_CANCEL_URL,
    ipn_url: process.env.PORTPOS_IPN_URL,
    webhook_ip_allowlist: process.env.PAYMENT_WEBHOOK_IP_ALLOWLIST,
  },

  redis: {
    url: process.env.REDIS_URL,
    rateLimitPrefix:
      process.env.REDIS_RATE_LIMIT_PREFIX ?? 'malamal:rate-limit',
  },

  rateLimit: {
    globalWindowMs: Number(
      process.env.RATE_LIMIT_GLOBAL_WINDOW_MS ?? 15 * 60 * 1000,
    ),
    globalMax: Number(process.env.RATE_LIMIT_GLOBAL_MAX ?? 200),

    publicWindowMs: Number(
      process.env.RATE_LIMIT_PUBLIC_WINDOW_MS ?? 60 * 1000,
    ),
    publicMax: Number(process.env.RATE_LIMIT_PUBLIC_MAX ?? 180),

    authWindowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? 60 * 1000),
    authMax: Number(process.env.RATE_LIMIT_AUTH_MAX ?? 8),

    actionWindowMs: Number(
      process.env.RATE_LIMIT_ACTION_WINDOW_MS ?? 60 * 1000,
    ),
    actionMax: Number(process.env.RATE_LIMIT_ACTION_MAX ?? 30),

    adminWindowMs: Number(process.env.RATE_LIMIT_ADMIN_WINDOW_MS ?? 60 * 1000),
    adminMax: Number(process.env.RATE_LIMIT_ADMIN_MAX ?? 60),

    paymentWindowMs: Number(
      process.env.RATE_LIMIT_PAYMENT_WINDOW_MS ?? 60 * 1000,
    ),
    paymentMax: Number(process.env.RATE_LIMIT_PAYMENT_MAX ?? 12),

    botPenaltyFloor: Number(process.env.RATE_LIMIT_BOT_PENALTY_FLOOR ?? 2),

    duplicateWindowMs: Number(process.env.REQUEST_DEDUP_WINDOW_MS ?? 5000),
  },

  urls: {
    frontend_app: process.env.FRONTEND_APP_URL,
    backend_public: process.env.BACKEND_PUBLIC_URL,
  },
};
