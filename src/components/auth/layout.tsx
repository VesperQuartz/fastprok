import type { ReactNode } from "react";

/**
 * Centered shell shared by the sign-in and sign-up pages.
 */
export const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
};
