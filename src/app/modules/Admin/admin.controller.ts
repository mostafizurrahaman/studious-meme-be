import httpStatus from 'http-status';
import { asyncHandler, sendResponse } from '../../utils';
import { AdminService } from './admin.service';

const getSingleParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

// 1. createAdmin
const createAdmin = asyncHandler(async (req, res) => {
  const result = await AdminService.createAdminIntoDB(req.body, req.file);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Admin created successfully!',
    data: result,
  });
});

// 2. getAllAdmins
const getAllAdmins = asyncHandler(async (_req, res) => {
  const result = await AdminService.getAllAdminsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Admins fetched successfully!',
    data: result,
  });
});

// 3. getAdmin
const getAdmin = asyncHandler(async (req, res) => {
  const result = await AdminService.getAdminByIdFromDB(
    getSingleParam(req.params.userId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Admin fetched successfully!',
    data: result,
  });
});

// 4. updateAdmin
const updateAdmin = asyncHandler(async (req, res) => {
  const result = await AdminService.updateAdminIntoDB(
    getSingleParam(req.params.userId),
    req.body,
    req.file,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Admin updated successfully!',
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
    message: 'Admin deleted successfully!',
    data: result,
  });
});

export const AdminController = {
  createAdmin,
  getAllAdmins,
  getAdmin,
  updateAdmin,
  deleteAdmin,
};
