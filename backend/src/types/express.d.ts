import { User } from './auth/type';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
