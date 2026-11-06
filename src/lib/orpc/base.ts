import "@orpc/openapi/extensions/route";

import { os } from "@orpc/server";

export type InitialContext = {
  headers: Headers;
  cookies: Record<string, string>;
};

export const base = os.$context<InitialContext>();
