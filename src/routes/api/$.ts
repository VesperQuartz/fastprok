import app from "@/lib/hono";
import "@/polyfill";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      HEAD: ({ request }) => app.fetch(request),
      GET: ({ request }) => app.fetch(request),
      POST: ({ request }) => app.fetch(request),
      PUT: ({ request }) => app.fetch(request),
      PATCH: ({ request }) => app.fetch(request),
      DELETE: ({ request }) => app.fetch(request),
    },
  },
});
