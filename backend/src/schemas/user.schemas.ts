import { z } from "zod";

// Limits mirror the column sizes in migrations/0001_initial_schema.sql.
const EMAIL_MAX_LENGTH = 255;
const FULL_NAME_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 8;
// bcrypt silently ignores everything after the first 72 bytes of input.
const PASSWORD_MAX_BYTES = 72;

// ---- Field schemas (reused across request schemas) -------------------------

/** Trimmed and lowercased before the format check, so "  Ana@X.com " is stored as "ana@x.com". */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email("Must be a valid email address.")
      .max(EMAIL_MAX_LENGTH, `Must be at most ${EMAIL_MAX_LENGTH} characters.`),
  );

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= PASSWORD_MAX_BYTES,
    `Must be at most ${PASSWORD_MAX_BYTES} bytes.`,
  );

const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Cannot be empty.")
  .max(FULL_NAME_MAX_LENGTH, `Must be at most ${FULL_NAME_MAX_LENGTH} characters.`);

// ---- Request schemas -------------------------------------------------------

export const userIdParamsSchema = z.object({
  id: z.uuid("Must be a valid UUID."),
});

export const listUsersQuerySchema = z.object({
  limit: z.coerce
    .number("Must be a number.")
    .int("Must be an integer.")
    .min(1, "Must be at least 1.")
    .max(100, "Must be at most 100.")
    .default(10),
  offset: z.coerce
    .number("Must be a number.")
    .int("Must be an integer.")
    .min(0, "Must be at least 0.")
    .default(0),
  filter: z.string().trim().optional(),
});

export const createUserBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
});

export const updateUserBodySchema = z
  .object({
    email: emailSchema.optional(),
    fullName: fullNameSchema.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "At least one of email or fullName must be provided.",
  });

export const emailAvailabilityBodySchema = z.object({
  email: emailSchema,
});

// ---- Inferred types (output = after trimming, lowercasing, defaults) -------

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type EmailAvailabilityBody = z.infer<typeof emailAvailabilityBodySchema>;
