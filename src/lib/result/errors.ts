import { TaggedError } from "better-result";

export class UnauthenticatedError extends TaggedError("UnauthenticatedError")<{
  message: string;
}> {
  constructor() {
    super({ message: "Sign in to continue." });
  }
}

export class ForbiddenError extends TaggedError("ForbiddenError")<{
  action: string;
  reason: string;
  message: string;
}> {
  constructor({ action, reason }: { action: string; reason: string }) {
    super({ action, reason, message: `You cannot ${action}: ${reason}.` });
  }
}

export class NotFoundError extends TaggedError("NotFoundError")<{
  resource: string;
  resourceId: string;
  message: string;
}> {
  constructor({ resource, resourceId }: { resource: string; resourceId: string }) {
    super({
      resource,
      resourceId,
      message: `${resource} ${resourceId} was not found.`,
    });
  }
}

export class ConflictError extends TaggedError("ConflictError")<{
  resource: string;
  detail: string;
  message: string;
}> {
  constructor({ resource, detail }: { resource: string; detail: string }) {
    super({
      resource,
      detail,
      message: `${resource} conflicts with existing data: ${detail}.`,
    });
  }
}

export class InvalidStateError extends TaggedError("InvalidStateError")<{
  action: string;
  currentStatus: string;
  message: string;
}> {
  constructor({ action, currentStatus }: { action: string; currentStatus: string }) {
    super({
      action,
      currentStatus,
      message: `Cannot ${action} while the request is ${currentStatus.replaceAll("_", " ")}.`,
    });
  }
}

export class InvalidInputError extends TaggedError("InvalidInputError")<{
  field: string;
  detail: string;
  message: string;
}> {
  constructor({ field, detail }: { field: string; detail: string }) {
    super({ field, detail, message: `${field} is invalid: ${detail}.` });
  }
}

export class DatabaseError extends TaggedError("DatabaseError")<{
  operation: string;
  cause: unknown;
  message: string;
}> {
  constructor({ operation, cause }: { operation: string; cause: unknown }) {
    super({
      operation,
      cause,
      message: `Database operation "${operation}" failed.`,
    });
  }
}

export class AiError extends TaggedError("AiError")<{
  operation: string;
  cause: unknown;
  retryable: boolean;
  message: string;
}> {
  constructor({
    operation,
    cause,
    retryable,
  }: {
    operation: string;
    cause: unknown;
    retryable: boolean;
  }) {
    super({
      operation,
      cause,
      retryable,
      message: `AI operation "${operation}" failed${retryable ? " and can be retried" : ""}.`,
    });
  }
}

export class EmailError extends TaggedError("EmailError")<{
  operation: string;
  cause: unknown;
  retryable: boolean;
  message: string;
}> {
  constructor({
    operation,
    cause,
    retryable,
  }: {
    operation: string;
    cause: unknown;
    retryable: boolean;
  }) {
    super({
      operation,
      cause,
      retryable,
      message: `Email delivery "${operation}" failed${retryable ? " and can be retried" : ""}.`,
    });
  }
}

export class StorageError extends TaggedError("StorageError")<{
  operation: string;
  cause: unknown;
  message: string;
}> {
  constructor({ operation, cause }: { operation: string; cause: unknown }) {
    super({
      operation,
      cause,
      message: `File storage operation "${operation}" failed.`,
    });
  }
}

export type AppError =
  | UnauthenticatedError
  | ForbiddenError
  | NotFoundError
  | ConflictError
  | InvalidStateError
  | InvalidInputError
  | DatabaseError
  | AiError
  | EmailError
  | StorageError;
