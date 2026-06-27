import z from 'zod';
import httpStatus from 'http-status';
import config from '../../config';
import {
  createAccessToken,
  createRefreshToken,
  deleteImageFromCloudinary,
  generateOtp,
  sendImageToCloudinary,
  verifyToken,
} from '../../lib';
import { AppError, sendOtpEmail } from '../../utils';
import { IUser } from './user.interface';
import UserModel from './user.model';
import {
  defaultUserImage,
  OTP_EXPIRY_MINUTES,
  ROLE,
  TDeactiveAccountPayload,
} from './user.constant';
import { UserValidation } from './user.validation';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { MulterFile } from '../../lib/upload';
import { PipelineStage } from 'mongoose';

// 1. createUserIntoDB
const createUserIntoDB = async (payload: IUser) => {
  const existingUser = await UserModel.isUserExistsByEmailWithPassword(
    payload.email,
  );

  // if user exists but unverified
  if (existingUser && !existingUser.isVerifiedByOTP) {
    const now = new Date();

    // if OTP expired sending new otp
    if (!existingUser.otpExpiry || existingUser.otpExpiry < now) {
      const otp = generateOtp();
      await sendOtpEmail({ email: payload?.email, otp, name: payload?.name });

      existingUser.otp = otp;
      existingUser.otpExpiry = new Date(
        now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000,
      );
      await existingUser.save();

      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You have an unverified account, verify it with the new OTP sent to the mail!',
        { isVerified: false },
      );
    } else {
      // if OTP is valid till now
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You have an unverified account, verify it now with the otp sent to the mail!',
        { isVerified: false },
      );
    }
  }

  if (existingUser && existingUser.isVerifiedByOTP) {
    // if user is already verified
    throw new AppError(httpStatus.BAD_REQUEST, 'User already exists!');
  }

  if (!existingUser) {
    //  OTP generating and sending if user is new
    const otp = generateOtp();
    await sendOtpEmail({ email: payload?.email, otp, name: payload?.name });

    // Save new user as unverified
    const now = new Date();
    const newUser = await UserModel.create({
      ...payload,
      otp,
      otpExpiry: new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000),
      isVerifiedByOTP: false,
    });

    return {
      userEmail: newUser.email,
    };
  }
};

// 2. sendSignupOtpAgainIntoDB
const sendSignupOtpAgainIntoDB = async (userEmail: string) => {
  const now = new Date();
  const user = await UserModel.isUserExistsByEmailWithPassword(userEmail);

  if (!user) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You must sign up first to get an OTP!',
    );
  } else if (user.isVerifiedByOTP) {
    // if user is already verified
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This account is already verified!',
    );
  } else if (!user.otpExpiry || user.otpExpiry < now) {
    // sending new OTP if previous one is expired
    const otp = generateOtp();

    // send OTP via Email
    await sendOtpEmail({ email: user?.email, otp, name: user?.name });

    user.otp = otp;
    user.otpExpiry = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    return {
      userEmail: user.email,
    };
  } else {
    // if OTP is still valid
    // await sendOtpEmail({
    //   email: user?.email,
    //   otp: user?.otp,
    //   name: user?.name,
    //   customMessage: 'Verify quickly using this OTP!',
    // });
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'An OTP was already sent. Please wait until it expires before requesting a new one.',
    );
  }
};

// 3. verifySignupOtpIntoDB
const verifySignupOtpIntoDB = async (userEmail: string, otp: string) => {
  const now = new Date();
  const user = await UserModel.isUserExistsByEmailWithPassword(userEmail);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // Check if the user is already verified
  if (user.isVerifiedByOTP) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This account is already verified!',
    );
  }

  // Check if OTP is expired
  if (!user.otpExpiry || user.otpExpiry < now) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'OTP has been expired. Please request a new one!',
    );
  }

  // If OTP is invalid, throw error
  if (user?.otp !== otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid OTP!');
  }

  // Mark user as verified
  user.isVerifiedByOTP = true;
  await user.save();

  // Prepare user data for token generation
  const accessTokenPayload = {
    _id: user?._id.toString(),
    name: user?.name,
    phone: user?.phone,
    email: user?.email,
    dob: user?.dob,
    image: user?.image || defaultUserImage,
    role: user?.role,
  };

  const refreshTokenPayload = {
    email: user?.email,
  };

  // tokens
  const accessToken = createAccessToken(accessTokenPayload);
  const refreshToken = createRefreshToken(refreshTokenPayload);

  return {
    accessToken,
    refreshToken,
    // user: accessTokenPayload,
  };
};

// 4. signinIntoDB
const signinIntoDB = async (payload: { email: string; password: string }) => {
  // const user = await UserModel.findOne({ email: payload.email }).select('+password');
  const user = await UserModel.isUserExistsByEmailWithPassword(payload.email);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not exist!');
  }

  if (!user.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User is not active!');
  }

  // no need this part as isDeleted is functioned to hide the soft deleted user
  // if (user.isDeleted) {
  //   throw new AppError(httpStatus.BAD_REQUEST, 'You are not authorized!');
  // }

  if (!user.isVerifiedByOTP) {
    const now = new Date();

    // if OTP expired sending new otp
    if (!user.otpExpiry || user.otpExpiry < now) {
      const otp = generateOtp();
      await sendOtpEmail({ email: user?.email, otp, name: user?.name });

      user.otp = otp;
      user.otpExpiry = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
      await user.save();

      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You have an unverified account, verify it with the new OTP sent to the mail!',
        { isVerified: false },
      );
    } else {
      // if OTP is valid till now
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You have an unverified account, verify it now with the otp sent to the mail!',
        { isVerified: false },
      );
    }
  }

  // Validate password
  const isPasswordCorrect = await user.isPasswordMatched(payload.password);

  if (!isPasswordCorrect) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid credentials!');
  }

  // Prepare user data for token generation
  const accessTokenPayload = {
    _id: user?._id.toString(),
    name: user?.name,
    email: user?.email,
    phone: user?.phone,
    dob: user?.dob,
    image: user?.image || defaultUserImage,
    role: user?.role,
  };

  const refreshTokenPayload = {
    email: user?.email,
  };
  // tokens
  const accessToken = createAccessToken(accessTokenPayload);
  const refreshToken = createRefreshToken(refreshTokenPayload);

  return {
    accessToken,
    refreshToken,
    // user: accessTokenPayload,
  };
};

// 5. updateProfilePhotoIntoDB
const updateProfilePhotoIntoDB = async (
  imageFile: MulterFile | undefined,
  user: IUser,
) => {
  // 1. Validation: Ensure an image file is provided
  if (!imageFile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Image is required!');
  }

  // 2. Upload the new profile photo to Cloudinary
  const { secure_url } = await sendImageToCloudinary(imageFile);

  // 3. Update the user's image URL in the database
  const userNewData = await UserModel.findByIdAndUpdate(
    user._id,
    { image: secure_url },
    { returnDocument: 'after' },
  ).select('name email phone dob image role');

  // 4. Rollback Logic: If DB update fails, delete the newly uploaded image from Cloudinary
  if (!userNewData) {
    // Use secure_url to delete from Cloudinary, not the local path
    await deleteImageFromCloudinary(secure_url);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update profile photo. Please try again!',
    );
  }

  // 5. Cleanup: Delete the previous image from Cloudinary if it exists and is not a default image
  if (user?.image && user.image !== defaultUserImage) {
    await deleteImageFromCloudinary(user.image);
  }

  // 6. Prepare payload and Generate a new Access Token with updated data
  const accessTokenPayload = {
    _id: userNewData?._id.toString(),
    name: userNewData?.name,
    email: userNewData?.email,
    phone: userNewData?.phone,
    dob: userNewData?.dob,
    image: userNewData?.image || defaultUserImage,
    role: userNewData?.role,
  };

  const accessToken = createAccessToken(accessTokenPayload);

  return {
    accessToken,
    // user: accessTokenPayload,
  };
};

// 6. updateProfileDataIntoDB
const updateProfileDataIntoDB = async (
  userData: IUser,
  payload: {
    name: string;
    phone: string;
    dob: Date;
  },
) => {
  const user = await UserModel.findByIdAndUpdate(userData._id, payload, {
    returnDocument: 'after',
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // Prepare user data for tokens
  const accessTokenPayload = {
    _id: user?._id.toString(),
    name: user?.name,
    email: user?.email,
    phone: user?.phone,
    dob: user?.dob,
    image: user?.image || defaultUserImage,
    role: user?.role,
  };

  const accessToken = createAccessToken(accessTokenPayload);

  return {
    accessToken,
    // user: accessTokenPayload,
  };
};

// 7. changePasswordIntoDB
const changePasswordIntoDB = async (
  payload: z.infer<typeof UserValidation.changePasswordSchema.shape.body>,
  userData: IUser,
) => {
  const { oldPassword, newPassword } = payload;

  // select password to use isPasswordMatched method
  const user = await UserModel.findOne({
    _id: userData._id,
    isActive: true,
  }).select('+password');

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not exists!'); // auth middleware already handled all checking
  }

  const isCredentialsCorrect = await user.isPasswordMatched(oldPassword);

  if (!isCredentialsCorrect) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Current password is not correct!',
    );
  }

  if (oldPassword === newPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'New password must be different!',
    );
  }

  user.password = newPassword;
  user.passwordChangedAt = new Date(Date.now() - 5000); // set 5 second before to avoid isJWTIssuedBeforePasswordChanged issue

  await user.save();

  // Prepare user data for tokens
  const accessTokenPayload = {
    _id: user?._id.toString(),
    name: user?.name,
    email: user?.email,
    phone: user?.phone,
    dob: user?.dob,
    image: user?.image || defaultUserImage,
    role: user?.role,
  };

  const accessToken = createAccessToken(accessTokenPayload);

  return {
    accessToken,
    // user: accessTokenPayload,
  };
};

// 8. forgotPassword 1.(send OTP)
const forgotPassword = async (email: string) => {
  const user = await UserModel.findOne({ email, isActive: true });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const now = new Date();

  // If OTP exists and not expired, reuse it
  if (user.otp && user.otpExpiry && now < user.otpExpiry) {
    // Do nothing, just reuse existing OTP
    const remainingMs = user.otpExpiry.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

    // await sendOtpEmail({email: user?.email, otp: user?.otp, name: user?.name});

    throw new AppError(
      httpStatus.NOT_FOUND,
      `Last OTP is valid till now, use that in ${remainingMinutes} minutes!`,
    );
  } else {
    // Generate new OTP
    const otp = generateOtp();
    const otpExpiry = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP
    await sendOtpEmail({ email, otp, name: user?.name });
  }

  // Issue token (just with email)
  const token = jwt.sign({ email }, config.jwt.otp_secret!, {
    expiresIn: config.jwt.otp_secret_expires_in!,
  } as SignOptions);

  return { token };
};

// 9. sendForgotPasswordOtpAgain 2.(send OTP again)
const sendForgotPasswordOtpAgain = async (forgotPassToken: string) => {
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(forgotPassToken, config.jwt.otp_secret!, {
      ignoreExpiration: true,
    }) as JwtPayload;
  } catch {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid token!');
  }

  const email = decoded.email as string;

  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid token!');
  }

  const user = await UserModel.findOne({ email, isActive: true });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const now = new Date();

  // If OTP exists and not expired, reuse it
  if (user.otp && user.otpExpiry && now < user.otpExpiry) {
    // Do nothing, just reuse existing OTP
    const remainingMs = user.otpExpiry.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

    // await sendOtpEmail({email: user?.email, otp: user?.otp, name: user?.name});

    throw new AppError(
      httpStatus.NOT_FOUND,
      `Last OTP is valid till now, use that in ${remainingMinutes} minutes!`,
    );
  } else {
    // Generate new OTP
    const otp = generateOtp();
    const otpExpiry = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP
    await sendOtpEmail({ email, otp, name: user?.name });
  }

  return null;
};

// 10. verifyOtpForForgotPassword 3. (verify OTP)
const verifyOtpForForgotPassword = async (payload: {
  token: string;
  otp: string;
}) => {
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(payload.token, config.jwt.otp_secret!, {
      ignoreExpiration: true,
    }) as JwtPayload;
  } catch {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid token!');
  }

  const email = decoded.email as string;

  const user = await UserModel.findOne({ email, isActive: true });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // Check if OTP expired
  if (!user.otp || !user.otpExpiry || Date.now() > user.otpExpiry.getTime()) {
    // Generate and send new OTP
    const newOtp = generateOtp();
    const newExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    user.otp = newOtp;
    user.otpExpiry = newExpiry;
    await user.save();

    await sendOtpEmail({ email, otp: newOtp, name: user?.name });

    throw new AppError(
      httpStatus.BAD_REQUEST,
      'OTP expired. A new OTP has been sent!',
    );
  }

  // Check if OTP matches
  if (user.otp !== payload.otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid OTP!');
  }

  // OTP verified → issue reset password token
  const resetPasswordToken = jwt.sign(
    {
      email: user.email,
      isResetPassword: true,
    },
    config.jwt.otp_secret!,
    { expiresIn: config.jwt.otp_secret_expires_in! } as SignOptions,
  );

  return { resetPasswordToken };
};

// 11. resetPasswordIntoDB 4. (set new password)
const resetPasswordIntoDB = async (
  payload: z.infer<typeof UserValidation.resetPasswordSchema.shape.body>,
) => {
  const { resetPasswordToken, newPassword } = payload;

  if (!resetPasswordToken) {
    throw new AppError(httpStatus.FORBIDDEN, 'Invalid reset password token!');
  }

  const resetPasswordPayload = verifyToken(
    resetPasswordToken,
    config.jwt.otp_secret!,
  ) as {
    email: string;
    isResetPassword?: boolean;
  };

  if (!resetPasswordPayload?.isResetPassword) {
    throw new AppError(httpStatus.FORBIDDEN, 'Invalid reset password token!');
  }

  const user = await UserModel.findOne({
    email: resetPasswordPayload.email,
    isActive: true,
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  user.password = newPassword;
  // user.passwordChangedAt = new Date(Date.now());

  // await user.save({ validateBeforeSave: true }) // by default true
  await user.save();

  return null;
};

// 12. fetchProfileFromDB
const fetchProfileFromDB = async (user: IUser) => {
  const result = await UserModel.findById(user._id).select(
    'name email phone dob image role',
  );

  return result;
};

// 13. getNewAccessTokenFromServer
const getNewAccessTokenFromServer = async (refreshToken: string) => {
  // checking if the given token is valid
  const decoded = verifyToken(
    refreshToken,
    config.jwt.refresh_secret!,
  ) as JwtPayload;

  const { email, iat } = decoded;

  // checking if the user is exist
  const user = await UserModel.isUserExistsByEmailWithPassword(email);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not exists!');
  }

  if (!user.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You are not authorized!');
  }

  // no need this part as isDeleted is functioned to hide the soft deleted user
  // if (user.isDeleted) {
  //   throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
  // }

  if (!user.isVerifiedByOTP) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
  }

  // checking if any hacker using a token even-after the user changed the password
  if (user.passwordChangedAt && user.isJWTIssuedBeforePasswordChanged(iat)) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
  }

  // Prepare user data for tokens
  const accessTokenPayload = {
    _id: user?._id.toString(),
    name: user?.name,
    email: user?.email,
    phone: user?.phone,
    dob: user?.dob,
    image: user?.image || defaultUserImage,
    role: user?.role,
  };

  const accessToken = createAccessToken(accessTokenPayload);

  return {
    accessToken,
  };
};

// 14. deactivateAccountIntoDB
const deactivateAccountIntoDB = async (
  payload: TDeactiveAccountPayload,
  user: IUser,
) => {
  const { email, password, deactivationReason } = payload;

  const currentUser = await UserModel.findOne({
    _id: user._id,
    email: email,
  }).select('+password');

  if (!currentUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const isPasswordCorrect = currentUser.isPasswordMatched(password);

  if (!isPasswordCorrect) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid credentials');
  }

  const result = await UserModel.findByIdAndUpdate(
    user._id,
    {
      $set: {
        isActive: false,
        deactivationReason,
      },
    },
    {
      returnDocument: 'after',
      select: 'email name address isActive deactivationReason',
    },
  );

  return result;
};

// 15. deleteSpecificUserAccountIntoDB
const deleteSpecificUserAccountIntoDB = async (user: IUser) => {
  const result = await UserModel.findByIdAndUpdate(
    user._id,
    {
      $set: {
        isDeleted: true,
      },
    },
    { returnDocument: 'after', select: 'email name address isDeleted' },
  );

  return result;
};

// 16. adminGetAllUsersFromDB (using MongoDB aggregation)
// const adminGetAllUsersFromDB = async (query: Record<string, unknown>) => {
//   const {
//     searchTerm,
//     sort: sortQuery,
//     page: pageQuery,
//     limit: limitQuery,
//     fields: fieldsQuery,
//     ...rawFilters
//   } = query as Record<string, any>;

//   const page = Number(pageQuery) || 1;
//   const limit = Number(limitQuery) || 10;
//   const skip = (page - 1) * limit;

//   // Base match: exclude admins
//   const matchStage: Record<string, unknown> = {
//     role: { $ne: ROLE.ADMIN },
//     ...rawFilters,
//   };

//   const pipeline: any[] = [{ $match: matchStage }];

//   // Search by name, email, phone, address
//   if (searchTerm) {
//     pipeline.push({
//       $match: {
//         $or: [
//           { name: { $regex: searchTerm, $options: 'i' } },
//           { email: { $regex: searchTerm, $options: 'i' } },
//           { phone: { $regex: searchTerm, $options: 'i' } },
//           { address: { $regex: searchTerm, $options: 'i' } },
//         ],
//       },
//     });
//   }

//   // Sort
//   const sortStage: Record<string, 1 | -1> = {};
//   const sortString = (sortQuery as string) || '-createdAt';
//   sortString
//     .split(',')
//     .filter(Boolean)
//     .forEach((field: string) => {
//       if (field.startsWith('-')) {
//         sortStage[field.substring(1)] = -1;
//       } else {
//         sortStage[field] = 1;
//       }
//     });

//   if (Object.keys(sortStage).length) {
//     pipeline.push({ $sort: sortStage });
//   }

//   // Fields selection
//   let projectStage: Record<string, 0 | 1> | null = null;
//   if (fieldsQuery) {
//     const fields = (fieldsQuery as string).split(',').filter(Boolean);
//     if (fields.length) {
//       projectStage = fields.reduce<Record<string, 0 | 1>>((acc, field) => {
//         acc[field] = 1;
//         return acc;
//       }, {});
//     }
//   }

//   const facetPipeline: any = {
//     data: [{ $skip: skip }, { $limit: limit }],
//     meta: [{ $count: 'total' }],
//   };

//   if (projectStage) {
//     facetPipeline.data.unshift({ $project: projectStage });
//   }

//   pipeline.push({ $facet: facetPipeline });

//   const result = await UserModel.aggregate(pipeline);
//   const facetResult = result[0] || { data: [], meta: [] };

//   const total = facetResult.meta[0]?.total || 0;
//   const totalPages = Math.ceil(total / limit) || 1;

//   const meta = {
//     page,
//     limit,
//     total,
//     totalPages,
//   };

//   return { data: facetResult.data, meta };
// };

// 17. adminGetAllUsersFromDB (using MongoDB aggregation)
const adminGetAllUsersFromDB = async (query: Record<string, unknown>) => {
  const {
    searchTerm,
    sort: sortQuery,
    page: pageQuery,
    limit: limitQuery,
    // fields: fieldsQuery,
    ...rawFilters
  } = query as Record<string, unknown>;

  if (rawFilters.isActive !== undefined) {
    rawFilters.isActive =
      rawFilters.isActive === 'true' || rawFilters.isActive === true;
  }

  const page = Number(pageQuery) || 1;
  const limit = Number(limitQuery) || 10;
  const skip = (page - 1) * limit;

  // Base match: exclude admins and super admins
  const matchStage: Record<string, unknown> = {
    role: { $nin: [ROLE.ADMIN, ROLE.SUPER_ADMIN] },
    ...rawFilters,
  };

  const pipeline: PipelineStage[] = [{ $match: matchStage }];

  // Search by name, email, phone
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { phone: { $regex: searchTerm, $options: 'i' } },
          // { address: { $regex: searchTerm, $options: 'i' } },
        ],
      },
    });
  }

  // Sort
  const sortStage: Record<string, 1 | -1> = {};
  const sortString = (sortQuery as string) || '-createdAt';
  sortString
    .split(',')
    .filter(Boolean)
    .forEach((field: string) => {
      if (field.startsWith('-')) {
        sortStage[field.substring(1)] = -1;
      } else {
        sortStage[field] = 1;
      }
    });

  if (Object.keys(sortStage).length) {
    pipeline.push({ $sort: sortStage });
  }

  // Fields selection
  // let projectStage: Record<string, 0 | 1> | null = null;
  // if (fieldsQuery) {
  //   const fields = (fieldsQuery as string).split(',').filter(Boolean);
  //   if (fields.length) {
  //     projectStage = fields.reduce<Record<string, 0 | 1>>((acc, field) => {
  //       acc[field] = 1;
  //       return acc;
  //     }, {});
  //   }
  // } else {
  // By default, exclude password from results
  // projectStage = {
  //   password: 0,
  //   otp: 0,
  //   otpExpiry: 0,
  //   // isVerifiedByOTP: 0,
  //   // isActive: 0,
  //   // isDeleted: 0,
  //   // deactivationReason: 0,
  //   // passwordChangedAt: 0,
  //   // role: 0,
  //   // createdAt: 0,
  //   // updatedAt: 0,
  // };
  // }

  const facetPipeline: Record<string, PipelineStage.FacetPipelineStage[]> = {
    data: [{ $skip: skip }, { $limit: limit }],
    meta: [{ $count: 'total' }],
  };

  // if (projectStage) {
  //   facetPipeline.data.unshift({ $project: projectStage });
  // }

  pipeline.push({ $facet: facetPipeline });

  const result = await UserModel.aggregate(pipeline);
  const facetResult = result[0] || { data: [], meta: [] };

  const total = facetResult.meta[0]?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const meta = {
    page,
    limit,
    total,
    totalPages,
  };

  return { data: facetResult.data, meta };
};

// 18. adminUpdateUserStatusIntoDB (activate/deactivate user)
const adminUpdateUserStatusIntoDB = async (
  userId: string,
  isActive: boolean,
) => {
  const user = await UserModel.findOneAndUpdate(
    { _id: userId, role: { $nin: [ROLE.ADMIN, ROLE.SUPER_ADMIN] } },
    { isActive },
    { returnDocument: 'after', runValidators: true },
  ).select('name email phone image isActive isDeleted createdAt updatedAt');

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  return null;
};

// 19. adminDeleteUserIntoDB (soft delete)
const adminDeleteUserIntoDB = async (userId: string) => {
  const user = await UserModel.findOneAndUpdate(
    { _id: userId, role: { $nin: [ROLE.ADMIN, ROLE.SUPER_ADMIN] } },
    { isDeleted: true, isActive: false },
    { returnDocument: 'after', runValidators: true },
  ).select('name email phone image isActive isDeleted createdAt updatedAt');

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  return null;
};

// 20. adminGetAllMetaDataFromDB (dashboard meta aggregation)
// const adminGetAllMetaDataFromDB = async () => {
//   const [
//     totalBooks,
//     totalOrders,
//     orderStats,
//     userGrowthRaw,
//     revenueSeriesRaw,
//     pendingOrders,
//   ] = await Promise.all([
//     BookModel.countDocuments({}),
//     OrderModel.countDocuments({}),
//     OrderModel.aggregate([
//       {
//         $match: {
//           paymentStatus: 'Paid',
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           totalRevenue: { $sum: '$finalAmount' },
//           totalPaidOrders: { $sum: 1 },
//           customers: { $addToSet: '$user' },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           totalRevenue: 1,
//           totalPaidOrders: 1,
//           activeCustomers: { $size: '$customers' },
//         },
//       },
//     ]),
//     UserModel.aggregate([
//       {
//         $group: {
//           _id: {
//             year: { $year: '$createdAt' },
//             month: { $month: '$createdAt' },
//           },
//           users: { $sum: 1 },
//         },
//       },
//       {
//         $sort: { '_id.year': 1, '_id.month': 1 },
//       },
//     ]),
//     OrderModel.aggregate([
//       {
//         $match: {
//           paymentStatus: 'Paid',
//         },
//       },
//       {
//         $group: {
//           _id: {
//             year: { $year: '$createdAt' },
//             month: { $month: '$createdAt' },
//           },
//           income: { $sum: '$finalAmount' },
//         },
//       },
//       {
//         $sort: { '_id.year': 1, '_id.month': 1 },
//       },
//     ]),
//     OrderModel.aggregate([
//       {
//         $match: {
//           deliveryStatus: { $ne: 'Delivered' },
//           isDeleted: { $ne: true },
//         },
//       },
//       {
//         $sort: { createdAt: -1 },
//       },
//       // {
//       //   $limit: 4,
//       // },
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'user',
//           foreignField: '_id',
//           as: 'user',
//         },
//       },
//       {
//         $unwind: '$user',
//       },
//       {
//         $lookup: {
//           from: 'books',
//           localField: 'books.book',
//           foreignField: '_id',
//           as: 'bookDetails',
//         },
//       },
//       {
//         $addFields: {
//           books: {
//             $map: {
//               input: '$books',
//               as: 'orderBook',
//               in: {
//                 quantity: '$$orderBook.quantity',
//                 unitPrice: '$$orderBook.unitPrice',
//                 book: {
//                   $arrayElemAt: [
//                     {
//                       $filter: {
//                         input: '$bookDetails',
//                         as: 'b',
//                         cond: { $eq: ['$$b._id', '$$orderBook.book'] },
//                       },
//                     },
//                     0,
//                   ],
//                 },
//               },
//             },
//           },
//         },
//       },
//       {
//         $project: {
//           bookDetails: 0,

//           // user sanitization
//           'user.password': 0,
//           'user.otp': 0,
//           'user.otpExpiry': 0,
//           'user.passwordChangedAt': 0,
//           'user.isDeleted': 0,
//           'user.deactivationReason': 0,
//           // 'user.isActive': 0,
//           // 'user.isVerifiedByOTP': 0,
//           'user.role': 0,
//           'user.createdAt': 0,
//           'user.updatedAt': 0,

//           // order-level meta in pendingOrders
//           isDeleted: 0,
//           createdAt: 0,
//           updatedAt: 0,

//           // book-level meta inside each order
//           'books.book.isActive': 0,
//           'books.book.createdAt': 0,
//           'books.book.updatedAt': 0,
//         },
//       },
//     ]),
//   ]);

//   const statsSummary = {
//     totalBooks,
//     totalOrders,
//     totalRevenue: orderStats[0]?.totalRevenue || 0,
//     activeCustomers: orderStats[0]?.activeCustomers || 0,
//   };

//   const MONTH_LABELS = [
//     'Jan',
//     'Feb',
//     'Mar',
//     'Apr',
//     'May',
//     'Jun',
//     'Jul',
//     'Aug',
//     'Sep',
//     'Oct',
//     'Nov',
//     'Dec',
//   ];

//   const userGrowthSeries = userGrowthRaw.reduce(
//     (
//       acc: { year: number; data: { month: string; users: number }[] }[],
//       item: any,
//     ) => {
//       const year = item._id.year as number;
//       const monthIndex = (item._id.month as number) - 1;
//       const monthLabel = MONTH_LABELS[monthIndex] || `${item._id.month}`;
//       const existingYear = acc.find((y) => y.year === year);

//       if (existingYear) {
//         existingYear.data.push({ month: monthLabel, users: item.users });
//       } else {
//         acc.push({ year, data: [{ month: monthLabel, users: item.users }] });
//       }

//       return acc;
//     },
//     [],
//   );

//   const revenueSeriesMap = revenueSeriesRaw.reduce(
//     (acc: Record<number, { month: string; income: number }[]>, item: any) => {
//       const year = item._id.year as number;
//       const monthIndex = (item._id.month as number) - 1;
//       const monthLabel = MONTH_LABELS[monthIndex] || `${item._id.month}`;

//       if (!acc[year]) {
//         acc[year] = [];
//       }

//       acc[year].push({ month: monthLabel, income: item.income });
//       return acc;
//     },
//     {},
//   );

//   const revenueSeries = Object.entries(revenueSeriesMap).map(
//     ([yearStr, data]) => {
//       const year = Number(yearStr);
//       const yearlyTotal = (data as any).reduce(
//         (sum: any, entry: any) => sum + entry.income,
//         0,
//       );
//       return {
//         year,
//         data,
//         yearlyTotal,
//       };
//     },
//   );

//   return {
//     stats: statsSummary,
//     userGrowthSeries,
//     revenueSeries,
//     pendingOrders,
//   };
// };

// 20. getAllUserFromDB
// const getAllUserFromDB = async (query: Record<string, unknown>) => {
//   const {
//     searchTerm,
//     sort: sortQuery,
//     page: pageQuery,
//     limit: limitQuery,
//     // fields: fieldsQuery,
//     ...rawFilters
//   } = query as Record<string, any>;

//   const page = Number(pageQuery) || 1;
//   const limit = Number(limitQuery) || 10;
//   const skip = (page - 1) * limit;

//   const pipeline: any[] = [{ $match: rawFilters }];

//   // Search by name, email, phone
//   if (searchTerm) {
//     pipeline.push({
//       $match: {
//         $or: [
//           { name: { $regex: searchTerm, $options: 'i' } },
//           { email: { $regex: searchTerm, $options: 'i' } },
//           { phone: { $regex: searchTerm, $options: 'i' } },
//           // { address: { $regex: searchTerm, $options: 'i' } },
//         ],
//       },
//     });
//   }

//   // Sort
//   const sortStage: Record<string, 1 | -1> = {};
//   const sortString = (sortQuery as string) || '-createdAt';
//   sortString
//     .split(',')
//     .filter(Boolean)
//     .forEach((field: string) => {
//       if (field.startsWith('-')) {
//         sortStage[field.substring(1)] = -1;
//       } else {
//         sortStage[field] = 1;
//       }
//     });

//   if (Object.keys(sortStage).length) {
//     pipeline.push({ $sort: sortStage });
//   }

//   // Fields selection
//   // let projectStage: Record<string, 0 | 1> | null = null;
//   // if (fieldsQuery) {
//   //   const fields = (fieldsQuery as string).split(',').filter(Boolean);
//   //   if (fields.length) {
//   //     projectStage = fields.reduce<Record<string, 0 | 1>>((acc, field) => {
//   //       acc[field] = 1;
//   //       return acc;
//   //     }, {});
//   //   }
//   // } else {
//   // By default, exclude password from results
//   // projectStage = {
//   //   password: 0,
//   //   otp: 0,
//   //   otpExpiry: 0,
//   //   // isVerifiedByOTP: 0,
//   //   // isActive: 0,
//   //   // isDeleted: 0,
//   //   // deactivationReason: 0,
//   //   // passwordChangedAt: 0,
//   //   // role: 0,
//   //   // createdAt: 0,
//   //   // updatedAt: 0,
//   // };
//   // }

//   const facetPipeline: any = {
//     data: [{ $skip: skip }, { $limit: limit }],
//     meta: [{ $count: 'total' }],
//   };

//   // if (projectStage) {
//   //   facetPipeline.data.unshift({ $project: projectStage });
//   // }

//   pipeline.push({ $facet: facetPipeline });

//   const result = await UserModel.aggregate(pipeline);
//   const facetResult = result[0] || { data: [], meta: [] };

//   const total = facetResult.meta[0]?.total || 0;
//   const totalPages = Math.ceil(total / limit) || 1;

//   const meta = {
//     page,
//     limit,
//     total,
//     totalPages,
//   };

//   return { data: facetResult.data, meta };
// };

export const UserService = {
  createUserIntoDB,
  sendSignupOtpAgainIntoDB,
  verifySignupOtpIntoDB,
  signinIntoDB,
  updateProfilePhotoIntoDB,
  updateProfileDataIntoDB,
  changePasswordIntoDB,
  forgotPassword,
  sendForgotPasswordOtpAgain,
  verifyOtpForForgotPassword,
  resetPasswordIntoDB,
  fetchProfileFromDB,
  getNewAccessTokenFromServer,
  deactivateAccountIntoDB,
  deleteSpecificUserAccountIntoDB,
  adminGetAllUsersFromDB,
  adminUpdateUserStatusIntoDB,
  adminDeleteUserIntoDB,
  // adminGetAllMetaDataFromDB,
  // getAllUserFromDB,
};
