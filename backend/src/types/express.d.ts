import { UserRecord } from "../repositories/user";

declare global {
  namespace Express {
    interface Request {
      user?: UserRecord;
    }
  }
}

export {};
