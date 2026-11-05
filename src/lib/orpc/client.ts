import { createORPCClient, type StandardUrl } from "@orpc/client";
import type { RouterClient } from "@orpc/server";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookies, getRequestHeaders } from "@tanstack/react-start/server";

import router from "@/lib/orpc/router";
import { OpenAPILink } from "@orpc/openapi/fetch";
import {
  BatchLinkPlugin,
  RequestCompressionLinkPlugin,
  ResponseCompressionLinkPlugin,
} from "@orpc/client/plugins";

interface ClientContext {
  cache?: RequestCache;
}

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(router, {
      context: () => ({
        headers: getRequestHeaders(),
        cookies: getCookies(),
      }),
    }),
  )
  .client((): RouterClient<typeof router> => {
    const link = new OpenAPILink<ClientContext>(router, {
      url: `${window.location.origin}/api/rpc` as StandardUrl,
      plugins: [
        new RequestCompressionLinkPlugin(),
        new ResponseCompressionLinkPlugin(),
        new BatchLinkPlugin({
          groups: [
            {
              condition: ({ context }) => context?.cache === "force-cache",
              context: {
                cache: "force-cache",
              },
            },
            {
              condition: () => true,
              context: {},
            },
          ],
        }),
      ],
    });
    return createORPCClient(link);
  });

export const client: RouterClient<typeof router> = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
