import httpStatus from 'http-status';
import { asyncHandler, sendResponse } from '../../utils';
import { AdminService } from './admin.service';

const getSingleParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

// 1. createAdmin
const createAdmin = asyncHandler(async (req, res) => {
  const result = await AdminService.createAdminIntoDB(
    req.body,
    req.user,
    req.file,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Staff created successfully!',
    data: result,
  });
});

// 2. getAllAdmins
const getAllAdmins = asyncHandler(async (req, res) => {
  const result = await AdminService.getAllAdminsFromDB(req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Staff accounts fetched successfully!',
    data: result,
  });
});

// 3. getAdmin
const getAdmin = asyncHandler(async (req, res) => {
  const result = await AdminService.getAdminByIdFromDB(
    getSingleParam(req.params.userId),
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Staff account fetched successfully!',
    data: result,
  });
});

// 4. updateAdmin
const updateAdmin = asyncHandler(async (req, res) => {
  const result = await AdminService.updateAdminIntoDB(
    getSingleParam(req.params.userId),
    req.body,
    req.user,
    req.file,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Staff account updated successfully!',
    data: result,
  });
});

// 5. deleteAdmin
const deleteAdmin = asyncHandler(async (req, res) => {
  const result = await AdminService.deleteAdminFromDB(
    getSingleParam(req.params.userId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Staff account deleted successfully!',
    data: result,
  });
});

// 6. changeStaffPassword
const changeStaffPassword = asyncHandler(async (req, res) => {
  const result = await AdminService.changeStaffPasswordInDB(
    getSingleParam(req.params.userId),
    req.body.password,
    req.user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Staff password updated successfully!',
    data: result,
  });
});

export const AdminController = {
  createAdmin,
  getAllAdmins,
  getAdmin,
  updateAdmin,
  deleteAdmin,
  changeStaffPassword,
};
