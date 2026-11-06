import { Result } from "better-result";
import { db, type DbTransaction } from "@/lib/db";
import { DatabaseError } from "./errors";

class TransactionAbort extends Error {
  constructor() {
    super("Transaction rolled back.");
  }
}

export const tryDatabase = <T>(operation: string, run: () => Promise<T>) =>
  Result.tryPromise({
    try: run,
    catch: (cause) =>
      new DatabaseError({
        operation,
        cause,
      }),
  });

export const withTransaction = async <T, E>(
  operation: string,
  run: (tx: DbTransaction) => Promise<Result<T, E>>,
): Promise<Result<T, E | DatabaseError>> => {
  let failure: E | undefined;

  const transaction = await Result.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const outcome = await run(tx);

        if (outcome.isErr()) {
          failure = outcome.error;
          throw new TransactionAbort();
        }

        return outcome.value;
      }),
    catch: (cause) =>
      failure === undefined
        ? new DatabaseError({
            operation,
            cause,
          })
        : failure,
  });

  return transaction;
};
