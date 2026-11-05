import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const myGlobalMiddleware = createMiddleware().server(({ next }) => {
  return next();
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [myGlobalMiddleware, csrfMiddleware],
  };
});
