import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { env } from "../config/env";
import { AppError } from "../utils/AppError";

interface ErrorDetail {
  path: string;
  message: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  errors: ErrorDetail[];
  stack?: string;
}

export function globalErrorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const response = toErrorResponse(error);

  res.status(response.statusCode).json(response.body);
}

function toErrorResponse(error: unknown): {
  statusCode: number;
  body: ErrorResponse;
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        success: false,
        message: error.message,
        errors: []
      }
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        success: false,
        message: "Validation failed.",
        errors: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      }
    };
  }

  const body: ErrorResponse = {
    success: false,
    message: "Internal server error.",
    errors: []
  };

  if (isDevelopment() && error instanceof Error) {
    body.stack = error.stack;
  }

  return {
    statusCode: 500,
    body
  };
}

function isDevelopment(): boolean {
  return env.NODE_ENV !== "production";
}
