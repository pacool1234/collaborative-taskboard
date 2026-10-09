import type { RequestHandler } from "express";
import type { z } from "zod";
import type { ApiError, RequestLocation, ValidationIssue } from "../types/api.types.js";

type RequestSchemas = Partial<Record<RequestLocation, z.ZodType>>;

/**
 * Shape of `res.locals` after `validate({ query })` ran. Express 5 makes
 * `req.query` read-only, so the parsed query is exposed here instead.
 */
export interface ValidatedQueryLocals<TQuery> {
  query: TQuery;
}

const LOCATIONS: readonly RequestLocation[] = ["params", "query", "body"];

// Applied to every parse: replaces Zod's generic "expected string, received
// undefined" with a clearer message. Schema-level messages still take precedence.
const parseOptions = {
  error: (issue: { input?: unknown }) => (issue.input === undefined ? "Required." : undefined),
};

/**
 * Validates and parses the request against the given Zod schemas.
 *
 * On success the parsed (trimmed, coerced, defaulted, unknown-keys-stripped)
 * values replace `req.body` / `req.params`; the parsed query goes to
 * `res.locals.query`. On failure it responds 400 with every issue found.
 *
 * Generics are `any` so it composes with strongly typed controllers on the
 * same route (Express infers one set of generics for the whole handler chain).
 */
export const validate = (schemas: RequestSchemas): RequestHandler<any, any> => {
  return (req, res, next) => {
    const issues: ValidationIssue[] = [];
    const parsed: Partial<Record<RequestLocation, unknown>> = {};

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location], parseOptions);

      if (result.success) {
        parsed[location] = result.data;
        continue;
      }

      for (const issue of result.error.issues) {
        const field = issue.path.join(".");
        issues.push({ location, ...(field && { field }), message: issue.message });
      }
    }

    if (issues.length > 0) {
      return res.status(400).json({
        error: { status: 400, message: "Validation failed.", details: issues },
      } satisfies ApiError);
    }

    if ("params" in parsed) req.params = parsed.params;
    if ("body" in parsed) req.body = parsed.body;
    if ("query" in parsed) res.locals.query = parsed.query;

    next();
  };
};
