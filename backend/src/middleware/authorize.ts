import type { RequestHandler } from "express";

import type { UserPermission } from "../models/user/user.types";
import { AppError } from "../utils/AppError";

export function authorize(...permissions: UserPermission[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError("Authentication token required.", 401));
      return;
    }

    const isAuthorized = req.user.permissions.some((permission) =>
      permissions.includes(permission)
    );

    if (!isAuthorized) {
      next(new AppError("Insufficient permissions.", 403));
      return;
    }

    next();
  };
}
