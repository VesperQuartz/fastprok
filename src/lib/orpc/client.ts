import { createORPCClient, type StandardUrl } from "@orpc/client";
import type { RouterClient } from "@orpc/server";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookies, getRequestHeaders } from "@tanstack/react-start/server";
import { OpenAPILink } from "@orpc/openapi/fetch";

import router from "@/lib/orpc/router";
import { clientContract } from "@/lib/orpc/client-contract";

type ServerRouter = typeof import("@/lib/orpc/router").default;

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(router, {
      context: () => ({
        headers: getRequestHeaders(),
        cookies: getCookies(),
      }),
    }),
  )
  .client((): RouterClient<ServerRouter> => {
    const link = new OpenAPILink(clientContract, {
      url: "/api/rpc" as StandardUrl,
    });

    return createORPCClient(link) as RouterClient<ServerRouter>;
  });

export const client: RouterClient<ServerRouter> = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
