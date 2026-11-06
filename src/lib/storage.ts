import { Result } from "better-result";
import { serverEnv } from "@/env/server";
import { StorageError } from "@/lib/result/errors";

export const PROFORMA_URL_TTL_SECONDS = 300;

type StorageSettings = {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  region: string;
};

const endpoint = () => {
  const host = serverEnv.AWS_HOST_BASE;

  if (!host) {
    return null;
  }

  return /^https?:\/\//.test(host) ? host : `https://${host}`;
};

const settings = (): StorageSettings | null => {
  const accessKeyId = serverEnv.AWS_ACCESS_KEY;
  const secretAccessKey = serverEnv.AWS_SECRET_KEY;
  const bucket = serverEnv.AWS_BUCKET;
  const host = endpoint();

  if (!accessKeyId || !secretAccessKey || !bucket || !host) {
    return null;
  }

  return {
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: host,
    region: serverEnv.AWS_REGION,
  };
};

let cachedClient: Bun.S3Client | null = null;

const client = (): Result<Bun.S3Client, StorageError> => {
  const config = settings();

  if (!config) {
    return Result.err(
      new StorageError({
        operation: "connect to object storage",
        cause: "AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_HOST_BASE, and AWS_BUCKET must be set.",
      }),
    );
  }

  if (typeof Bun === "undefined") {
    return Result.err(
      new StorageError({
        operation: "connect to object storage",
        cause: "Object storage is only available when the server runs on Bun.",
      }),
    );
  }

  cachedClient ??= new Bun.S3Client(config);

  return Result.ok(cachedClient);
};

const headerFileName = (fileName: string) =>
  fileName.replaceAll(/[^\w.-]+/g, "-").replaceAll(/^-+|-+$/g, "") || "proforma";

export const putObject = async ({
  key,
  body,
  contentType,
  fileName,
}: {
  key: string;
  body: ArrayBuffer;
  contentType: string;
  fileName: string;
}) => {
  const bucket = client();

  if (bucket.isErr()) {
    return bucket;
  }

  return Result.tryPromise({
    try: () =>
      bucket.value.write(key, body, {
        acl: "private",
        type: contentType,
        contentDisposition: `inline; filename="${headerFileName(fileName)}"`,
      }),
    catch: (cause) =>
      new StorageError({
        operation: "upload proforma invoice",
        cause,
      }),
  });
};

export const removeObject = async (key: string) => {
  const bucket = client();

  if (bucket.isErr()) {
    return bucket;
  }

  return Result.tryPromise({
    try: () => bucket.value.delete(key),
    catch: (cause) =>
      new StorageError({
        operation: "delete proforma invoice",
        cause,
      }),
  });
};

export const presignObject = (key: string) => {
  const bucket = client();

  if (bucket.isErr()) {
    return bucket;
  }

  return Result.tryPromise({
    try: async () =>
      bucket.value.file(key).presign({
        expiresIn: PROFORMA_URL_TTL_SECONDS,
      }),
    catch: (cause) =>
      new StorageError({
        operation: "sign proforma invoice URL",
        cause,
      }),
  });
};
