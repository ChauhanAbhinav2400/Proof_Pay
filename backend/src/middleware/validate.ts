import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodIssue, type ZodType } from "zod";

type RequestPart = "body" | "params" | "query";

export interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

const REQUEST_PARTS: readonly RequestPart[] = ["body", "params", "query"];

export function validate(schemas: ValidationSchemas): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const issues: ZodIssue[] = [];

    for (const part of REQUEST_PARTS) {
      const schema = schemas[part];

      if (!schema) {
        continue;
      }

      const result = await schema.safeParseAsync(req[part]);

      if (!result.success) {
        issues.push(
          ...result.error.issues.map((issue) => ({
            ...issue,
            path: [part, ...issue.path]
          }))
        );
        continue;
      }

      req[part] = result.data;
    }

    if (issues.length > 0) {
      next(new ZodError(issues));
      return;
    }

    next();
  };
}
