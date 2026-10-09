import type { NextFunction, Request, Response } from "express";
import { DatabaseError } from "pg";
import type { ApiError, ValidationIssue } from "../types/api.types.js";

// PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_UNIQUE_VIOLATION = "23505";
const PG_INVALID_TEXT_REPRESENTATION = "22P02";

/**
 * Unique constraints mapped to the request field they protect, so a 409 can
 * point the client at the offending field. Names come from `\d <table>` in psql.
 */
const UNIQUE_CONSTRAINT_ISSUES: Record<string, ValidationIssue> = {
  users_email_key: { location: "body", field: "email", message: "Email is already in use." },
};

/** Errors raised by Express/body-parser (e.g. malformed JSON) carry a safe-to-expose 4xx status. */
const isClientHttpError = (err: unknown): err is { status: number; message: string } =>
  err instanceof Error &&
  "status" in err &&
  typeof err.status === "number" &&
  err.status >= 400 &&
  err.status < 500 &&
  "expose" in err &&
  err.expose === true;

export const notFoundHandler = (req: Request, res: Response<ApiError>) => {
  res.status(404).json({
    error: { status: 404, message: `Route ${req.method} ${req.originalUrl} not found.` },
  });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response<ApiError>,
  _next: NextFunction,
) => {
  if (isClientHttpError(err)) {
    return res.status(err.status).json({
      error: { status: err.status, message: err.message },
    });
  }

  if (err instanceof DatabaseError) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      const issue = err.constraint ? UNIQUE_CONSTRAINT_ISSUES[err.constraint] : undefined;
      return res.status(409).json({
        error: {
          status: 409,
          message: issue?.message ?? "A resource with these values already exists.",
          ...(issue && { details: [issue] }),
        },
      });
    }
    // Safety net: request validation should reject malformed values (e.g. UUIDs) first.
    if (err.code === PG_INVALID_TEXT_REPRESENTATION) {
      return res.status(400).json({
        error: { status: 400, message: "Invalid identifier or value format." },
      });
    }
  }

  console.error(err);
  res.status(500).json({
    error: { status: 500, message: "Internal Server Error" },
  });
};
