import httpStatus from 'http-status';
import { asyncHandler, sendResponse } from '../../utils';
import { AddressService } from './address.services';

const getSingleParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

// 1. Create Address
const createAddress = asyncHandler(async (req, res) => {
  const result = await AddressService.createAddressIntoDB(req.user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Address added successfully!',
    data: result,
  });
});

// 2. Get My Addresses
const getMyAddresses = asyncHandler(async (req, res) => {
  const result = await AddressService.getMyAddressesFromDB(req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Addresses fetched successfully!',
    data: result,
  });
});

// 3. Update Address
const updateAddress = asyncHandler(async (req, res) => {
  const addressId = getSingleParam(req.params.addressId);
  const result = await AddressService.updateAddressIntoDB(
    req.user,
    addressId,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Address updated successfully!',
    data: result,
  });
});

// 4. Delete Address
const deleteAddress = asyncHandler(async (req, res) => {
  const addressId = getSingleParam(req.params.addressId);
  const result = await AddressService.deleteAddressFromDB(req.user, addressId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Address deleted successfully!',
    data: result,
  });
});

// 5. Set Default Address
const setDefaultAddress = asyncHandler(async (req, res) => {
  const addressId = getSingleParam(req.params.addressId);
  const result = await AddressService.setDefaultAddressIntoDB(req.user, addressId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Default address set successfully!',
    data: result,
  });
});

export const AddressController = {
  createAddress,
  getMyAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
