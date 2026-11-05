import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface TokenStore {
  token: string | undefined;
  setToken: (token: string | undefined) => void;
}

export const useBearStore = create<TokenStore>()(
  devtools(
    persist(
      (set) => ({
        token: undefined,
        setToken: (token) => set(() => ({ token })),
      }),
      {
        name: "token-storage",
      },
    ),
  ),
);
