import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppError } from "./errors";

export const httpStatusFor = (error: AppError) =>
  error.match({
    UnauthenticatedError: () => 401,
    ForbiddenError: () => 403,
    NotFoundError: () => 404,
    ConflictError: () => 409,
    InvalidStateError: () => 409,
    InvalidInputError: () => 400,
    DatabaseError: () => 500,
    AiError: () => 502,
    EmailError: () => 502,
    StorageError: () => 502,
  }) as ContentfulStatusCode;
