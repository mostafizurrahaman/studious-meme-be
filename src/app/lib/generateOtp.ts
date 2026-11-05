import crypto from 'crypto';

const generateOtp = (): string => {
  // Generates a cryptographically secure 6-digit numeric OTP (100000 - 999999)
  return crypto.randomInt(100000, 1000000).toString();
};

export default generateOtp;
