import { sendOtpEmail } from '../../utils';

const sendTestEmail = async (email: string) => {
  const res = await sendOtpEmail({
    email,
    otp: '44545',
    name: 'Mostafizur',
  });

  return res;
};

export const testServices = {
  sendTestEmail,
};
