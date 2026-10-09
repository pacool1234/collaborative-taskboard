import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db/pool.js";
import { USERS_QUERIES } from "../queries/users.queries.js";
import type { ApiData, ApiError, ApiPaginated } from "../types/api.types.js";
import type {
  CreateUserBody,
  ListUsersQuery,
  PublicUser,
  UpdateUserBody,
  UserIdParams,
} from "../types/user.types.js";
import { generateUUID } from "../utils/id.js";

const SALT_ROUNDS = 10;

const notFound = (res: Response<ApiError>, id: string) =>
  res.status(404).json({
    error: { status: 404, message: `User with ID ${id} not found.` },
  });

const getAllUsers = async (
  req: Request<Record<string, never>, ApiPaginated<PublicUser>, unknown, ListUsersQuery>,
  res: Response<ApiPaginated<PublicUser>>,
  next: NextFunction,
) => {
  try {
    const { limit, offset, filter } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 100);
    const parsedOffset = Math.max(parseInt(String(offset), 10) || 0, 0);

    const searchFilter = typeof filter === "string" && filter.trim() ? `%${filter.trim()}%` : null;

    const result = await pool.query<PublicUser>(USERS_QUERIES.selectAll, [
      searchFilter,
      parsedLimit,
      parsedOffset,
    ]);

    res.status(200).json({
      data: result.rows,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        count: result.rows.length,
      },
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

    const result = await pool.query<PublicUser>(USERS_QUERIES.insert, [
      userId,
      email.trim(),
      passwordHash,
      fullName.trim(),
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
      email?.trim() ?? null,
      fullName?.trim() ?? null,
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

export { getAllUsers, getUserById, createUser, updateUserById, deleteUserById };
