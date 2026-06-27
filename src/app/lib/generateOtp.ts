import otpGenerator from 'otp-generator';

const generateOtp = () => {
  const otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  // const otp = Math.floor(100000 + Math.random() * 900000);

  return otp;
};

export default generateOtp;
