import { createRouter, parseSearchWith, stringifySearchWith } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { parse, stringify } from "jsurl2";
import { NotFound } from "@/components/not-found";
import * as TanstackQuery from "@/providers/query/root-provider";
import { DefaultCatchBoundary } from "./components/catch-boundary";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const rqContext = TanstackQuery.getContext();

  const router = createRouter({
    routeTree,
    parseSearch: parseSearchWith(parse),
    stringifySearch: stringifySearchWith(stringify),
    scrollRestoration: true,
    context: { ...rqContext },
    defaultPreload: "intent",
    defaultErrorComponent: DefaultCatchBoundary,
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => {
      return <NotFound />;
    },
    Wrap: (props: { children: React.ReactNode }) => {
      return <TanstackQuery.Provider {...rqContext}>{props.children}</TanstackQuery.Provider>;
    },
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient: rqContext.queryClient,
  });

  return router;
};
