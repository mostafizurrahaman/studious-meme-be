import type { IUser } from '../modules/User/user.interface';

declare global {
  namespace Express {
    interface Request {
      user: IUser;
    }
  }
}
