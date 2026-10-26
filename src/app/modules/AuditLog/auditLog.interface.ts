import { Types } from 'mongoose';
import { TRole } from '../User/user.constant';

export type TAuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'REORDER'
  | 'LOGIN'
  | 'BULK_ACTION'
  | 'OTHER';

export type TAuditModule =
  | 'HERO_SECTION'
  | 'PRODUCT'
  | 'BRAND'
  | 'CATEGORY'
  | 'ORDER'
  | 'PAYMENT'
  | 'COUPON'
  | 'USER'
  | 'ADMIN'
  | 'PAGE'
  | 'AUTH'
  | 'SYSTEM';

export interface IAuditLog {
  _id?: string;
  user?: Types.ObjectId;
  userName: string;
  userEmail: string;
  userRole: TRole;
  userImage?: string;
  action: TAuditAction;
  module: TAuditModule;
  description: string;
  entityId?: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
