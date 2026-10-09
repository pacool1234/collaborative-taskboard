import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db/pool.js";
import type { ValidatedQueryLocals } from "../middleware/validate.js";
import { USERS_QUERIES } from "../queries/users.queries.js";
import type {
  CreateUserBody,
  EmailAvailabilityBody,
  ListUsersQuery,
  UpdateUserBody,
  UserIdParams,
} from "../schemas/user.schemas.js";
import type { ApiData, ApiError, ApiPaginated } from "../types/api.types.js";
import type { EmailAvailability, PublicUser } from "../types/user.types.js";
import { generateUUID } from "../utils/id.js";

// Every handler below runs after `validate(...)` (see users.routes.ts), so its
// input is already parsed: trimmed, lowercased, coerced and defaulted.

const SALT_ROUNDS = 10;

const notFound = (res: Response<ApiError>, id: string) =>
  res.status(404).json({
    error: { status: 404, message: `User with ID ${id} not found.` },
  });

const getAllUsers = async (
  _req: Request,
  res: Response<ApiPaginated<PublicUser>, ValidatedQueryLocals<ListUsersQuery>>,
  next: NextFunction,
) => {
  try {
    const { limit, offset, filter } = res.locals.query;

    const searchFilter = filter ? `%${filter}%` : null;

    const result = await pool.query<PublicUser>(USERS_QUERIES.selectAll, [
      searchFilter,
      limit,
      offset,
    ]);

    res.status(200).json({
      data: result.rows,
      pagination: { limit, offset, count: result.rows.length },
    });
  } catch (err) {
    next(err);
  }
};

const getUserById = async (
  req: Request<UserIdParams>,
  res: Response<ApiData<PublicUser> | ApiError>,
  next: NextFunction,
) => {
  try {
    const result = await pool.query<PublicUser>(USERS_QUERIES.selectById, [req.params.id]);
    const user = result.rows[0];

    if (!user) {
      return notFound(res, req.params.id);
    }

    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
};

const createUser = async (
  req: Request<Record<string, never>, ApiData<PublicUser>, CreateUserBody>,
  res: Response<ApiData<PublicUser>>,
  next: NextFunction,
) => {
  try {
    const { email, password, fullName } = req.body;

    const userId = generateUUID();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // A duplicate email is rejected by the users_email_key constraint and
    // turned into a 409 by errorHandler — even if the client skipped the
    // email-availability check, or two signups race each other.
    const result = await pool.query<PublicUser>(USERS_QUERIES.insert, [
      userId,
      email,
      passwordHash,
      fullName,
      null,
    ]);

    const newUser = result.rows[0]!;

    res.set("Location", `/users/${userId}`);
    res.status(201).json({ data: newUser });
  } catch (err) {
    next(err);
  }
};

const updateUserById = async (
  req: Request<UserIdParams, ApiData<PublicUser> | ApiError, UpdateUserBody>,
  res: Response<ApiData<PublicUser> | ApiError>,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { email, fullName } = req.body;

    const result = await pool.query<PublicUser>(USERS_QUERIES.updateById, [
      id,
      email ?? null,
      fullName ?? null,
    ]);
    const user = result.rows[0];

    if (!user) {
      return notFound(res, id);
    }

    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
};

const deleteUserById = async (
  req: Request<UserIdParams>,
  res: Response<ApiError>,
  next: NextFunction,
) => {
  try {
    const result = await pool.query<{ id: string }>(USERS_QUERIES.deleteById, [req.params.id]);

    if (result.rowCount === 0) {
      return notFound(res, req.params.id);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

/**
 * UX helper for signup forms. Not a guarantee: the unique constraint on
 * users.email remains the source of truth (see createUser).
 */
const checkEmailAvailability = async (
  req: Request<Record<string, never>, ApiData<EmailAvailability>, EmailAvailabilityBody>,
  res: Response<ApiData<EmailAvailability>>,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;

    const result = await pool.query<{ exists: boolean }>(USERS_QUERIES.emailExists, [email]);

    res.status(200).json({ data: { email, available: !result.rows[0]!.exists } });
  } catch (err) {
    next(err);
  }
};

export {
  getAllUsers,
  getUserById,
  createUser,
  updateUserById,
  deleteUserById,
  checkEmailAvailability,
};
