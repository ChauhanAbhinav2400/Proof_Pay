import { ErrorRequestHandler } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { Error as MongooseError } from "mongoose";

import { AppError } from "../utils/AppError";

interface ErrorResponse {
  success: false;
  message: string;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const { statusCode, message } = normalizeError(error);

  const response: ErrorResponse = {
    success: false,
    message
  };

  res.status(statusCode).json(response);
};

function normalizeError(error: unknown): { statusCode: number; message: string } {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message
    };
  }

  if (error instanceof MongooseError.ValidationError) {
    return {
      statusCode: 400,
      message: error.message
    };
  }

  if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
    return {
      statusCode: 401,
      message: "Invalid or expired token"
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      message: error.message
    };
  }

  return {
    statusCode: 500,
    message: "Internal server error"
  };
}
