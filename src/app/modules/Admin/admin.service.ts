import httpStatus from 'http-status';
import { AppError } from '../../utils';
import {
  deleteImageByUrl,
  R2_FOLDERS,
  sendImageToR2,
} from '../../lib';
import { ROLE, TRole } from '../User/user.constant';
import UserModel from '../User/user.model';
import { IAdminCreatePayload } from './admin.interface';
import { MulterFile } from '../../lib/upload';
import { JwtPayload } from 'jsonwebtoken';

// 1. createAdminIntoDB
const createAdminIntoDB = async (
  payload: IAdminCreatePayload,
  creatorUser?: JwtPayload | any,
  imageFile?: MulterFile,
) => {
  const existing = await UserModel.isUserExistsByEmailWithPassword(
    payload.email,
  );

  if (existing) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email already exists!');
  }

  const creatorRole = creatorUser?.role;
  let targetRole: TRole = ROLE.MODERATOR;

  if (creatorRole === ROLE.SUPER_ADMIN) {
    targetRole = payload.role === ROLE.ADMIN ? ROLE.ADMIN : ROLE.MODERATOR;
  } else if (creatorRole === ROLE.ADMIN) {
    if (payload.role && payload.role !== ROLE.MODERATOR) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Admin can only create Moderator accounts!',
      );
    }
    targetRole = ROLE.MODERATOR;
  } else {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to create staff accounts!',
    );
  }

  let uploadedImage: string | undefined;

  try {
    if (imageFile) {
      const { secure_url } = await sendImageToR2(imageFile, R2_FOLDERS.ADMIN);
      uploadedImage = secure_url;
    }

    const admin = await UserModel.create({
      ...payload,
      image: uploadedImage ?? payload.image,
      role: targetRole,
      isVerifiedByOTP: true,
    });

    return {
      userId: admin._id,
      email: admin.email,
      role: admin.role,
    };
  } catch (error) {
    if (uploadedImage) {
      await deleteImageByUrl(uploadedImage);
    }

    throw error;
  }
};

// 2. getAllAdminsFromDB
const getAllAdminsFromDB = async (requesterUser?: any) => {
  const requesterRole = requesterUser?.role;
  const filter =
    requesterRole === ROLE.ADMIN
      ? { role: ROLE.MODERATOR, isDeleted: { $ne: true } }
      : { role: { $in: [ROLE.ADMIN, ROLE.MODERATOR] }, isDeleted: { $ne: true } };

  return UserModel.find(filter)
    .select('name email phone image role isActive createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean();
};

// 3. getAdminByIdFromDB
const getAdminByIdFromDB = async (userId: string, requesterUser?: any) => {
  const requesterRole = requesterUser?.role;
  const filter: any = { _id: userId, isDeleted: { $ne: true } };
  if (requesterRole === ROLE.ADMIN) {
    filter.role = ROLE.MODERATOR;
  } else {
    filter.role = { $in: [ROLE.ADMIN, ROLE.MODERATOR] };
  }

  const admin = await UserModel.findOne(filter)
    .select('name email phone image role isActive createdAt updatedAt')
    .lean();

  if (!admin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Staff member not found!');
  }

  return admin;
};

// 4. updateAdminIntoDB
const updateAdminIntoDB = async (
  userId: string,
  payload: Partial<IAdminCreatePayload> & { isActive?: boolean },
  requesterUser?: any,
  imageFile?: MulterFile,
) => {
  const requesterRole = requesterUser?.role;
  const filter: any = { _id: userId, isDeleted: { $ne: true } };
  if (requesterRole === ROLE.ADMIN) {
    filter.role = ROLE.MODERATOR;
    if (payload.role && payload.role !== ROLE.MODERATOR) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Admin cannot change staff role to Admin!',
      );
    }
  } else {
    filter.role = { $in: [ROLE.ADMIN, ROLE.MODERATOR] };
  }

  const existingAdmin = await UserModel.findOne(filter).select('image role');

  if (!existingAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Staff member not found!');
  }

  let uploadedImage: string | undefined;

  try {
    if (imageFile) {
      const { secure_url } = await sendImageToR2(imageFile, R2_FOLDERS.ADMIN);
      uploadedImage = secure_url;
    }

    const admin = await UserModel.findOneAndUpdate(
      filter,
      { ...payload, ...(uploadedImage ? { image: uploadedImage } : {}) },
      { returnDocument: 'after', runValidators: true },
    ).select('name email phone image role isActive createdAt updatedAt');

    if (!admin) {
      if (uploadedImage) {
        await deleteImageByUrl(uploadedImage);
      }
      throw new AppError(httpStatus.NOT_FOUND, 'Staff member not found!');
    }

    if (
      uploadedImage &&
      existingAdmin.image &&
      existingAdmin.image !== uploadedImage
    ) {
      await deleteImageByUrl(existingAdmin.image);
    }

    return admin;
  } catch (error) {
    if (uploadedImage) {
      await deleteImageByUrl(uploadedImage);
    }

    throw error;
  }
};

// 5. deleteAdminFromDB
const deleteAdminFromDB = async (userId: string) => {
  const admin = await UserModel.findOneAndUpdate(
    { _id: userId, role: { $in: [ROLE.ADMIN, ROLE.MODERATOR] } },
    { isDeleted: true, isActive: false },
    { returnDocument: 'after' },
  ).select('name email phone image role isActive isDeleted createdAt updatedAt');

  if (!admin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Staff member not found!');
  }

  return admin;
};

// 6. changeStaffPasswordInDB
const changeStaffPasswordInDB = async (
  userId: string,
  newPassword: string,
  requesterUser?: any,
) => {
  const requesterRole = requesterUser?.role;
  const filter: any = { _id: userId, isDeleted: { $ne: true } };

  if (requesterRole === ROLE.ADMIN) {
    filter.role = ROLE.MODERATOR;
  } else if (requesterRole === ROLE.SUPER_ADMIN) {
    filter.role = { $in: [ROLE.ADMIN, ROLE.MODERATOR] };
  } else {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to change staff passwords!',
    );
  }

  const targetStaff = await UserModel.findOne(filter);
  if (!targetStaff) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Staff account not found or you do not have permission to modify this account!',
    );
  }

  targetStaff.password = newPassword;
  targetStaff.passwordChangedAt = new Date();
  await targetStaff.save();

  return {
    userId: targetStaff._id,
    email: targetStaff.email,
    role: targetStaff.role,
  };
};

export const AdminService = {
  createAdminIntoDB,
  getAllAdminsFromDB,
  getAdminByIdFromDB,
  updateAdminIntoDB,
  deleteAdminFromDB,
  changeStaffPasswordInDB,
};
