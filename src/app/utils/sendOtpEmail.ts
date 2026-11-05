import httpStatus from 'http-status';
import nodemailer from 'nodemailer';
import config from '../config';
import AppError from './AppError';
import path from 'path';
import fs from 'fs';

const FALLBACK_LOGO_URL =
  'https://res.cloudinary.com/dweesppci/image/upload/v1777476137/1777476137166-KHALED-SIDDIQUE.png';

const sendOtpEmail = async ({
  email,
  otp,
  name = 'User',
  subject = 'Your OTP for Account Verification',
  logoCid = 'malamal_logo',
  customMessage = '',
  attachments = [],
}: {
  email: string;
  otp: string;
  name?: string;
  subject?: string;
  logoCid?: string;
  customMessage?: string;
  attachments?: { filename: string; path: string }[];
}) => {
  try {
    const isCustomPort = Boolean(process.env.EMAIL_PORT_FOR_NODEMAILER);
    const port = Number(process.env.EMAIL_PORT_FOR_NODEMAILER) || 465;
    const secure = isCustomPort ? port === 465 : true;

    // Create transporter for sending emails
    const transporter = nodemailer.createTransport({
      host: config.nodemailer.host,
      port,
      secure,
      auth: {
        user: config.nodemailer.email,
        pass: config.nodemailer.password,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    // Determine logo source safely
    const localLogoPath = path.join(__dirname, 'assets', 'logo.png');
    const hasLocalLogo =
      config.NODE_ENV !== 'production' && fs.existsSync(localLogoPath);

    const emailAttachments: Array<{
      filename: string;
      path: string;
      cid?: string;
    }> = [...attachments];

    if (hasLocalLogo) {
      emailAttachments.push({
        filename: 'logo.png',
        path: localLogoPath,
        cid: logoCid,
      });
    }

    // Generate HTML content dynamically
    const htmlTemplate = generateEmailHTML(
      otp,
      name,
      hasLocalLogo ? `cid:${logoCid}` : FALLBACK_LOGO_URL,
      customMessage,
    );

    // Email options: from, to, subject, and HTML body
    const mailOptions = {
      from: `${config.preffered_website_name || 'Malamal'} <${config.nodemailer.email}>`,
      to: email,
      subject,
      html: htmlTemplate,
      attachments: emailAttachments,
    };

    // Send email using Nodemailer
    await transporter.sendMail(mailOptions);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Nodemailer sendMail failed:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send verification email. Please try again later.',
    );
  }
};

export default sendOtpEmail;

// Utility function to generate email HTML content dynamically
const generateEmailHTML = (
  otp: string,
  name: string,
  logoSrc: string,
  customMessage: string = '',
) => {
  const brandName = config.preffered_website_name || 'Malamal';
  const brandColor = config.emailColor || '#f54c16';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f7f9fc;
      margin: 0;
      padding: 0;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
      background-image: linear-gradient(to right, #f9fafc, #ffffff);
    }
    .header {
      text-align: center;
      padding-bottom: 30px;
      border-bottom: 3px solid #f0f0f0;
    }
    .header img {
      max-width: 180px;
      max-height: 70px;
      object-fit: contain;
      margin-bottom: 25px;
    }
    .header h2 {
      color: ${brandColor};
      font-size: 26px;
      margin-bottom: 10px;
      font-weight: bold;
    }
    .otp {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 6px;
      color: ${brandColor};
      padding: 15px;
      background-color: #FFF8E1;
      border-left: 6px solid ${brandColor};
      text-align: center;
      margin: 30px 0;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #888888;
      padding-top: 30px;
      border-top: 2px solid #f0f0f0;
      margin-top: 30px;
    }
    @media only screen and (max-width: 600px) {
      .container {
        padding: 20px;
      }
      .otp {
        font-size: 24px;
        letter-spacing: 4px;
        padding: 12px;
      }
      .footer {
        font-size: 10px;
      }
      .header h2 {
        font-size: 22px;
      }
    }
  </style>
</head>
<body>

  <div class="container">
    <div class="header">
      <img src="${logoSrc}" alt="${brandName} Logo">
      <h2>Welcome to ${brandName}!</h2>
      <p>We're excited to have you with us.</p>
    </div>

    <p>Hello ${name},</p>
    <p>We received a request to verify your email address. Your one-time password (OTP) is:</p>

    <div class="otp">
      ${otp}
    </div>

    <p>Please enter this OTP to complete your verification and start using ${brandName}.</p>
    <p><strong>Note:</strong> This OTP will expire in 5 minutes. Be sure to enter it before it expires.</p>

    ${customMessage ? `<p><strong>Additional Info:</strong> ${customMessage}</p>` : ''}

    <div class="footer">
      <p>Thank you for choosing ${brandName}. If you did not request this, please ignore this email.</p>
    </div>
  </div>

</body>
</html>
  `;
};
