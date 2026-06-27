import bcrypt from 'bcryptjs';
import { Aggregate, model, Query, Schema } from 'mongoose';
import config from '../../config';
import { defaultUserImage, ROLE } from './user.constant';
import { IUser, IUserModel } from './user.interface';
import { AppError } from '../../utils';
import httpStatus from 'http-status';

const userSchema = new Schema<IUser, IUserModel>(
  {
    name: {
      type: String,
      required: [true, 'Name is required!'],
    },

    phone: {
      type: String,
      default: 'N/A',
    },

    dob: {
      type: Date,
      default: null,
    },

    image: {
      type: String,
      default: defaultUserImage,
    },

    email: {
      type: String,
      required: [true, 'Email is required!'],
      unique: [true, 'This email is already used!'],
    },

    password: {
      type: String,
      required: true,
      select: 0, // 🔒 by default password will not be returned in response in all find queries, not in save and aggregation
    },

    passwordChangedAt: {
      type: Date,
    },

    otp: {
      type: String,
      required: true,
    },

    otpExpiry: {
      type: Date,
      required: true,
    },

    isVerifiedByOTP: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: Object.values(ROLE),
      default: ROLE.USER,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deactivationReason: {
      type: String,
    },
  },
  { timestamps: true, versionKey: false },
);

userSchema.index(
  { role: 1, createdAt: -1 },
  { name: 'user_role_createdAt_idx' },
);

// Custom hooks/methods

// Hash password before saving
userSchema.pre('save', async function (this: IUser) {
  // only hash if new user OR password modified
  if (this.isNew || this.isModified('password')) {
    if (!this.password) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Password is required!');
    }

    // 🔑 hash password
    this.password = await bcrypt.hash(
      this.password,
      Number(config.bcrypt_salt_rounds),
    );

    // ⏱️ set password changed time
    if (!this.isModified('passwordChangedAt')) {
      this.passwordChangedAt = new Date();
    }
  }
});

// Clear password after saving
userSchema.post('save', function (doc: IUser, next) {
  if (doc) {
    doc.password = '';
  }
  next();
});

// This makes problem hiding password while gettting user for checking password verification
// userSchema.post('find', function (doc, next) {
//   if (doc) {
//     doc.password = '';
//   }
//   next();
// });

// userSchema.post('findOne', function (doc, next) {
//   if (doc) {
//     doc.password = '';
//   }
//   next();
// });

// Remove deleted documents from find queries

// all find queries
userSchema.pre(/^find/, function (this: Query<IUser, IUser>) {
  // only return non-deleted users
  this.where({ isDeleted: { $ne: true } });
});

//  single find query
// userSchema.pre('find', function (next) {
//   this.find({ isDeleted: { $ne: true } });
//   next();
// });

//  findOne query
// userSchema.pre('findOne', function (next) {
//   this.find({ isDeleted: { $ne: true } });
//   next();
// });

// aggregation query
userSchema.pre('aggregate', function (this: Aggregate<IUser>) {
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
});

// isUserExistsByEmailWithPassword
userSchema.statics.isUserExistsByEmailWithPassword = async function (
  email: string,
): Promise<IUser | null> {
  return await UserModel.findOne({ email }).select('+password');
};

// isPasswordMatched
userSchema.methods.isPasswordMatched = async function (
  plainTextPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(plainTextPassword, this.password);
};

// isJWTIssuedBeforePasswordChanged
userSchema.methods.isJWTIssuedBeforePasswordChanged = function (
  jwtIssuedTimestamp: number,
): boolean {
  // if password not changed after jwt issue timestamp
  if (!this.passwordChangedAt) return false;

  const passwordChangedTime = new Date(this.passwordChangedAt).getTime() / 1000;

  return passwordChangedTime > jwtIssuedTimestamp;
};

const UserModel = model<IUser, IUserModel>('User', userSchema);

export default UserModel;
