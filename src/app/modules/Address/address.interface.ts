import { Types } from 'mongoose';
import { TAddressType } from './address.constant';

export interface IAddress {
  user: Types.ObjectId;
  fullName: string;
  phoneNumber: string;
  email: string;
  district: string;
  deliveryAddress: string;
  type: TAddressType;
  isDefault: boolean;
}

export interface IAddressDoc extends IAddress, Document {}
