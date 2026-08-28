import httpStatus from 'http-status';
import { PipelineStage, Types } from 'mongoose';
import { AppError } from '../../utils';
import { IUser } from '../User/user.interface';
import { Address } from './address.model';
import { IAddress } from './address.interface';

const toObjectId = (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid Address ID!');
  }
  return new Types.ObjectId(id);
};

// 1. Create Address
const createAddressIntoDB = async (
  user: IUser,
  payload: Omit<IAddress, 'user'>,
) => {
  // ?? Count Address:
  const totalAddress = await Address.countDocuments({ user: user?._id });

  if (totalAddress >= 3) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot add more than 5 addresses to your address book.',
    );
  }

  if (totalAddress === 0) {
    payload.isDefault = true;
  }

  if (payload.isDefault) {
    await Address.updateMany(
      { user: user._id },
      { $set: { isDefault: false } },
    );
  }

  const address = await Address.create({
    ...payload,
    user: user._id,
  });

  return address;
};

// 2. Get My Addresses
const getMyAddressesFromDB = async (user: IUser) => {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        user: user?._id,
      },
    },
  ];

  const addresses = await Address.aggregate(pipeline);

  return addresses;
};

// 3. Update Address
const updateAddressIntoDB = async (
  user: IUser,
  addressId: string,
  payload: Partial<IAddress>,
) => {
  const targetId = toObjectId(addressId);

  if (payload.isDefault) {
    await Address.updateMany(
      { user: user._id },
      { $set: { isDefault: false } },
    );
  }

  const updatedAddress = await Address.findOneAndUpdate(
    { _id: targetId, user: user._id },
    payload,
    { returnDocument: 'after', runValidators: true },
  ).lean();

  if (!updatedAddress) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Address not found or you are not authorized to update it!',
    );
  }

  return updatedAddress;
};

// 4. Delete Address
const deleteAddressFromDB = async (user: IUser, addressId: string) => {
  const targetId = toObjectId(addressId);

  const deletedAddress = await Address.findOneAndDelete({
    _id: targetId,
    user: user._id,
  }).lean();

  if (!deletedAddress) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Address not found or you are not authorized to delete it!',
    );
  }

  return deletedAddress;
};

// 5. Set Default Address
const setDefaultAddressIntoDB = async (user: IUser, addressId: string) => {
  const targetId = toObjectId(addressId);

  const addressExists = await Address.findOne({
    _id: targetId,
    user: user._id,
  });
  if (!addressExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Address not found or you are not authorized to update it!',
    );
  }

  await Address.updateMany({ user: user._id }, { $set: { isDefault: false } });

  const updatedAddress = await Address.findOneAndUpdate(
    { _id: targetId, user: user._id },
    { isDefault: true },
    { returnDocument: 'after', runValidators: true },
  ).lean();

  return updatedAddress;
};

export const AddressService = {
  createAddressIntoDB,
  getMyAddressesFromDB,
  updateAddressIntoDB,
  deleteAddressFromDB,
  setDefaultAddressIntoDB,
};
