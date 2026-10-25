import { model, Schema } from 'mongoose';
import { IAuditLog } from './auditLog.interface';
import { ROLE } from '../User/user.constant';

const auditLogSchema = new Schema<IAuditLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    userName: {
      type: String,
      required: [true, 'User name is required!'],
      trim: true,
    },
    userEmail: {
      type: String,
      required: [true, 'User email is required!'],
      trim: true,
      index: true,
    },
    userRole: {
      type: String,
      enum: Object.values(ROLE),
      required: [true, 'User role is required!'],
      index: true,
    },
    userImage: {
      type: String,
      default: '',
    },
    action: {
      type: String,
      enum: [
        'CREATE',
        'UPDATE',
        'DELETE',
        'STATUS_CHANGE',
        'REORDER',
        'LOGIN',
        'BULK_ACTION',
        'OTHER',
      ],
      required: [true, 'Action type is required!'],
      index: true,
    },
    module: {
      type: String,
      enum: [
        'HERO_SECTION',
        'PRODUCT',
        'BRAND',
        'CATEGORY',
        'ORDER',
        'PAYMENT',
        'COUPON',
        'USER',
        'ADMIN',
        'PAGE',
        'AUTH',
        'SYSTEM',
      ],
      required: [true, 'Module is required!'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required!'],
      trim: true,
    },
    entityId: {
      type: String,
      default: null,
    },
    method: {
      type: String,
      required: [true, 'HTTP method is required!'],
      trim: true,
    },
    path: {
      type: String,
      required: [true, 'Request path is required!'],
      trim: true,
    },
    statusCode: {
      type: Number,
      required: [true, 'Status code is required!'],
    },
    ipAddress: {
      type: String,
      default: 'Unknown',
    },
    userAgent: {
      type: String,
      default: 'Unknown',
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound indexes for optimal dashboard search and analytics queries
auditLogSchema.index({ timestamp: -1, module: 1 });
auditLogSchema.index({ timestamp: -1, action: 1 });
auditLogSchema.index({ timestamp: -1, userRole: 1 });

export const AuditLogModel = model<IAuditLog>('AuditLog', auditLogSchema);
