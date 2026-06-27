import httpStatus from 'http-status';
import { AppError, sendOtpEmail } from '../../utils';
import {
  deleteImageFromCloudinary,
  generateOtp,
  sendImageToCloudinary,
} from '../../lib';
import { OTP_EXPIRY_MINUTES, ROLE } from '../User/user.constant';
import UserModel from '../User/user.model';
import { IAdminCreatePayload } from './admin.interface';
import { MulterFile } from '../../lib/upload';

// 1. createAdminIntoDB
const createAdminIntoDB = async (
  payload: IAdminCreatePayload,
  imageFile?: MulterFile,
) => {
  const existing = await UserModel.isUserExistsByEmailWithPassword(
    payload.email,
  );

  if (existing) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email already exists!');
  }

  const otp = generateOtp();
  await sendOtpEmail({ email: payload.email, otp, name: payload.name });

  let uploadedImage: string | undefined;

  try {
    if (imageFile) {
      const { secure_url } = await sendImageToCloudinary(imageFile);
      uploadedImage = secure_url;
    }

    const admin = await UserModel.create({
      ...payload,
      image: uploadedImage ?? payload.image,
      role: ROLE.ADMIN,
      otp,
      otpExpiry: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      isVerifiedByOTP: false,
    });

    return {
      userId: admin._id,
      email: admin.email,
      role: admin.role,
    };
  } catch (error) {
    if (uploadedImage) {
      await deleteImageFromCloudinary(uploadedImage);
    }

    throw error;
  }
};

// 2. getAllAdminsFromDB
const getAllAdminsFromDB = async () => {
  return UserModel.find({ role: ROLE.ADMIN })
    .select('name email phone image isActive createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean();
};

// 3. getAdminByIdFromDB
const getAdminByIdFromDB = async (userId: string) => {
  const admin = await UserModel.findOne({ _id: userId, role: ROLE.ADMIN })
    .select('name email phone image isActive createdAt updatedAt')
    .lean();

  if (!admin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin not found!');
  }

  return admin;
};

// 4. updateAdminIntoDB
const updateAdminIntoDB = async (
  userId: string,
  payload: Partial<IAdminCreatePayload> & { isActive?: boolean },
  imageFile?: MulterFile,
) => {
  const existingAdmin = await UserModel.findOne({
    _id: userId,
    role: ROLE.ADMIN,
  }).select('image');

  if (!existingAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin not found!');
  }

  let uploadedImage: string | undefined;

  try {
    if (imageFile) {
      const { secure_url } = await sendImageToCloudinary(imageFile);
      uploadedImage = secure_url;
    }

    const admin = await UserModel.findOneAndUpdate(
      { _id: userId, role: ROLE.ADMIN },
      { ...payload, ...(uploadedImage ? { image: uploadedImage } : {}) },
      { returnDocument: 'after', runValidators: true },
    ).select('name email phone image isActive createdAt updatedAt');

    if (!admin) {
      if (uploadedImage) {
        await deleteImageFromCloudinary(uploadedImage);
      }
      throw new AppError(httpStatus.NOT_FOUND, 'Admin not found!');
    }

    if (
      uploadedImage &&
      existingAdmin.image &&
      existingAdmin.image !== uploadedImage
    ) {
      await deleteImageFromCloudinary(existingAdmin.image);
    }

    return admin;
  } catch (error) {
    if (uploadedImage) {
      await deleteImageFromCloudinary(uploadedImage);
    }

    throw error;
  }
};

// 5. deleteAdminFromDB
const deleteAdminFromDB = async (userId: string) => {
  const admin = await UserModel.findOneAndUpdate(
    { _id: userId, role: ROLE.ADMIN },
    { isDeleted: true, isActive: false },
    { returnDocument: 'after' },
  ).select('name email phone image isActive isDeleted createdAt updatedAt');

  if (!admin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin not found!');
  }

  return admin;
};

export const AdminService = {
  createAdminIntoDB,
  getAllAdminsFromDB,
  getAdminByIdFromDB,
  updateAdminIntoDB,
  deleteAdminFromDB,
};
