import httpStatus from 'http-status';
import { AppError } from '../../utils';
import { IAuditLog } from './auditLog.interface';
import { AuditLogModel } from './auditLog.model';

// 1. recordAuditLog (Non-blocking, safe logging)
const recordAuditLog = async (payload: Partial<IAuditLog>) => {
  try {
    const doc = await AuditLogModel.create(payload);
    return doc;
  } catch (error) {
    // Audit logging should never bring down the primary API flow
    // eslint-disable-next-line no-console
    console.error('⚠️ [AuditLog] Failed to record audit log:', error);
    return null;
  }
};

// 2. getAllAuditLogsFromDB (Paginated, filterable, searchable)
const getAllAuditLogsFromDB = async (query: Record<string, unknown> = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (query.action && query.action !== 'ALL') {
    filter.action = String(query.action).toUpperCase();
  }

  if (query.module && query.module !== 'ALL') {
    filter.module = String(query.module).toUpperCase();
  }

  if (query.userRole && query.userRole !== 'ALL') {
    filter.userRole = String(query.userRole).toUpperCase();
  }

  if (query.userId) {
    filter.user = query.userId;
  }

  if (query.startDate || query.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (query.startDate) {
      dateFilter.$gte = new Date(String(query.startDate));
    }
    if (query.endDate) {
      const end = new Date(String(query.endDate));
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    filter.timestamp = dateFilter;
  }

  const searchTerm =
    typeof query.searchTerm === 'string' ? query.searchTerm.trim() : '';
  if (searchTerm) {
    filter.$or = [
      { userName: { $regex: searchTerm, $options: 'i' } },
      { userEmail: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { path: { $regex: searchTerm, $options: 'i' } },
      { entityId: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    AuditLogModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLogModel.countDocuments(filter),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

// 3. getAuditLogStatsFromDB (Dashboard Metrics & Analytics)
const getAuditLogStatsFromDB = async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalLogs,
    todayLogs,
    superAdminLogs,
    adminLogs,
    actionAggregates,
    moduleAggregates,
    topAdmins,
  ] = await Promise.all([
    AuditLogModel.countDocuments(),
    AuditLogModel.countDocuments({ timestamp: { $gte: startOfToday } }),
    AuditLogModel.countDocuments({ userRole: 'SUPER_ADMIN' }),
    AuditLogModel.countDocuments({ userRole: 'ADMIN' }),
    AuditLogModel.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    AuditLogModel.aggregate([
      { $group: { _id: '$module', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    AuditLogModel.aggregate([
      {
        $group: {
          _id: '$userEmail',
          name: { $first: '$userName' },
          role: { $first: '$userRole' },
          image: { $first: '$userImage' },
          totalActions: { $sum: 1 },
          lastAction: { $max: '$timestamp' },
        },
      },
      { $sort: { totalActions: -1 } },
      { $limit: 5 },
    ]),
  ]);

  return {
    totalLogs,
    todayLogs,
    superAdminLogs,
    adminLogs,
    actionBreakdown: actionAggregates.map((item) => ({
      action: item._id,
      count: item.count,
    })),
    moduleBreakdown: moduleAggregates.map((item) => ({
      module: item._id,
      count: item.count,
    })),
    topAdmins: topAdmins.map((item) => ({
      email: item._id,
      name: item.name,
      role: item.role,
      image: item.image,
      totalActions: item.totalActions,
      lastAction: item.lastAction,
    })),
  };
};

// 4. getAuditLogByIdFromDB
const getAuditLogByIdFromDB = async (id: string) => {
  const doc = await AuditLogModel.findById(id).lean();
  if (!doc) {
    throw new AppError(httpStatus.NOT_FOUND, 'Audit log entry not found!');
  }
  return doc;
};

export const AuditLogService = {
  recordAuditLog,
  getAllAuditLogsFromDB,
  getAuditLogStatsFromDB,
  getAuditLogByIdFromDB,
};
