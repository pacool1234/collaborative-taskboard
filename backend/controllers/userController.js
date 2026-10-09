import bcrypt from "bcrypt";
import { pool } from "../db/db.js";
import { USERS_QUERIES } from "../queries/users.queries.js";
// import { validateBook } from "../middleware/validateBook.js";

const getAllUsers = async (req, res, next) => {
  try {
    const { limit, offset, filter } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const searchFilter = filter ? `%${filter.trim()}%` : null;

    const result = await pool.query(USERS_QUERIES.selectAll, [searchFilter, parsedLimit, parsedOffset]);

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

const getUserById = async (req, res, next) => {
  try {
    const result = await db.query(USERS_QUERIES.selectById, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          status: 404,
          message: "Book not found",
        },
      });
    }

    res.status(200).json({
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;

		const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(USERS_QUERIES.insert, [
      email.trim(),
      passwordHash,
      fullName.trim(),
			""
    ]);

    const newUser = result.rows[0];

    res.set("Location", `/users/${result.rows[0].id}`);

    res.status(201).json({ data: newUser });
  } catch (err) {
    next(err);
  }
};

// booksRouter.put("/books/:id", validateBook(true), async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { title, author, published_year, genre } = req.body;

//     const result = await db.query(BOOK_QUERIES.update, [
//       id,
//       title?.trim(),
//       author?.trim(),
//       published_year,
//       genre?.trim(),
//     ]);

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         error: { status: 404, message: `Book with ID ${id} not found.` },
//       });
//     }

//     res.status(200).json({ data: result.rows[0] });
//   } catch (err) {
//     next(err);
//   }
// });

const deleteUserById = async (req, res, next) => {
  try {
    const result = await db.query(USERS_QUERIES.deleteById, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export { getAllUsers, getUserById, createUser, deleteUserById };