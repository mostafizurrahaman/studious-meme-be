import httpStatus from 'http-status';
import { asyncHandler, sendResponse } from '../../utils';
import { AuditLogService } from './auditLog.service';
import { getParam } from '../../lib/getParam';

// 1. getAllAuditLogs
const getAllAuditLogs = asyncHandler(async (req, res) => {
  const result = await AuditLogService.getAllAuditLogsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Audit logs fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

// 2. getAuditLogStats
const getAuditLogStats = asyncHandler(async (_req, res) => {
  const result = await AuditLogService.getAuditLogStatsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Audit log statistics fetched successfully!',
    data: result,
  });
});

// 3. getAuditLogById
const getAuditLogById = asyncHandler(async (req, res) => {
  const result = await AuditLogService.getAuditLogByIdFromDB(
    getParam(req.params.id),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Audit log details fetched successfully!',
    data: result,
  });
});

export const AuditLogController = {
  getAllAuditLogs,
  getAuditLogStats,
  getAuditLogById,
};
