import type { RequestHandler } from "express";
import type { ApiError } from "../types/api.types.js";

const USER_FIELDS = ["email", "password", "fullName"] as const;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Validates the user payload. Params and response body are left as `any` so
 * this middleware composes with strongly typed controllers on the same route
 * (Express infers one set of generics for the whole handler chain).
 */
export const validateUser = (isUpdate = false): RequestHandler<any, any> => {
  return (req, res, next) => {
    const body: unknown = req.body;

    if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
      return res.status(400).json({
        error: {
          status: 400,
          message: "Request body cannot be empty.",
        },
      } satisfies ApiError);
    }

    const fields = body as Record<string, unknown>;
    const errors: string[] = [];

    for (const field of USER_FIELDS) {
      const value = fields[field];

      if (!isUpdate && !isNonEmptyString(value)) {
        errors.push(`${field} is required and must be a non-empty string.`);
      } else if (value !== undefined && !isNonEmptyString(value)) {
        errors.push(`${field} must be a non-empty string.`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: {
          status: 400,
          message: "Validation Failed",
          details: errors,
        },
      } satisfies ApiError);
    }

    next();
  };
};
