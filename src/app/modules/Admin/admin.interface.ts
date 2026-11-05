import { TRole } from '../User/user.constant';

export interface IAdminCreatePayload {
  name: string;
  email: string;
  password: string;
  role?: TRole;
  phone?: string;
  image?: string;
}
