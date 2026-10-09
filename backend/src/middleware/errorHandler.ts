import type { NextFunction, Request, Response } from "express";
import type { ApiError } from "../types/api.types.js";

// PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_UNIQUE_VIOLATION = "23505";
const PG_INVALID_TEXT_REPRESENTATION = "22P02";

const hasPgCode = (err: unknown): err is { code: string } =>
  typeof err === "object" && err !== null && "code" in err && typeof err.code === "string";

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
  if (hasPgCode(err)) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      return res.status(409).json({
        error: { status: 409, message: "A resource with these values already exists." },
      });
    }
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
