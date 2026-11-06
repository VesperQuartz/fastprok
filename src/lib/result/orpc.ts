import { ORPCError, type AnyORPCError } from "@orpc/server";
import type { Result } from "better-result";
import type { AppError } from "./errors";

export const toORPCError = (error: AppError): AnyORPCError =>
  error.match({
    UnauthenticatedError: (cause) =>
      new ORPCError("UNAUTHORIZED", {
        message: cause.message,
      }),
    ForbiddenError: (cause) =>
      new ORPCError("FORBIDDEN", {
        message: cause.message,
      }),
    NotFoundError: (cause) =>
      new ORPCError("NOT_FOUND", {
        message: cause.message,
      }),
    ConflictError: (cause) =>
      new ORPCError("CONFLICT", {
        message: cause.message,
      }),
    InvalidStateError: (cause) =>
      new ORPCError("CONFLICT", {
        message: cause.message,
      }),
    InvalidInputError: (cause) =>
      new ORPCError("BAD_REQUEST", {
        message: cause.message,
      }),
    DatabaseError: (cause) => {
      console.error("Database operation failed", cause.operation, cause.cause);

      return new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "The request could not be completed. Try again.",
      });
    },
    AiError: (cause) => {
      console.error("AI operation failed", cause.operation, cause.cause);

      return new ORPCError("BAD_GATEWAY", {
        message: "The AI service is unavailable right now.",
      });
    },
    EmailError: (cause) => {
      console.error("Email operation failed", cause.operation, cause.cause);

      return new ORPCError("BAD_GATEWAY", {
        message: "The email service is unavailable right now.",
      });
    },
    StorageError: (cause) => {
      console.error("Storage operation failed", cause.operation, cause.cause);

      return new ORPCError("BAD_GATEWAY", {
        message: "File storage is unavailable right now.",
      });
    },
  });

export const unwrapResult = async <T, E extends AppError>(
  result: Result<T, E> | Promise<Result<T, E>>,
): Promise<T> => {
  const settled = await result;

  if (settled.isErr()) {
    throw toORPCError(settled.error);
  }

  return settled.value;
};
