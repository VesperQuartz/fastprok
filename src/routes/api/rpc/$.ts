import "@/polyfill";

import {
  BatchHandlerPlugin,
  CORSPlugin,
  GetMethodCsrfProtectionHandlerPlugin,
  RequestCompressionHandlerPlugin,
  ResponseCompressionHandlerPlugin,
} from "@orpc/server/plugins";
import { createFileRoute } from "@tanstack/react-router";
import { getCookies } from "@tanstack/react-start/server";
import router from "@/lib/orpc/router";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { OpenAPIReferenceHandlerPlugin } from "@orpc/openapi/plugins";
import { SmartCoercionHandlerPlugin } from "@orpc/json-schema";

const generator = new OpenAPIGenerator({
  converters: [new ZodToJsonSchemaConverter()],
});

const handler = new OpenAPIHandler(router, {
  plugins: [
    new SmartCoercionHandlerPlugin({
      converters: [new ZodToJsonSchemaConverter()],
    }),
    new CORSPlugin({
      origin: (origin, _options) => origin,
      allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
      exposeHeaders: ["Content-Disposition", "Standard-Server"],
    }),
    new BatchHandlerPlugin(),
    new ResponseCompressionHandlerPlugin(),
    new RequestCompressionHandlerPlugin(),
    new GetMethodCsrfProtectionHandlerPlugin(),
    new OpenAPIReferenceHandlerPlugin({
      spec: () =>
        generator.generate(router, {
          base: {
            info: {
              title: "ORPC Playground",
              version: "1.0.0",
            },
            servers: [{ url: "" }],
          },
        }),
    }),
  ],
});

async function handle({ request }: { request: Request }) {
  const { response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: {
      headers: request.headers,
      cookies: getCookies(),
    },
  });

  return response ?? new Response("Not Found", { status: 404 });
}

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      HEAD: handle,
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
});
