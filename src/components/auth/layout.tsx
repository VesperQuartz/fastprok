import type { ReactNode } from "react";

/**
 * Centered shell shared by the sign-in and sign-up pages.
 */
export const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-[#f6f7f9] p-4">
      <div className="w-full max-w-md py-8">{children}</div>
    </div>
  );
};
