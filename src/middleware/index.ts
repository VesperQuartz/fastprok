import { createMiddleware } from "@tanstack/react-start";

export const checkAuth = createMiddleware().server(({ next }) => {
  return next();
});
