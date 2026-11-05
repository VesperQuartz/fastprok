/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Client-side environment variables
  readonly VITE_APP_NAME: string;
  readonly VITE_BASE: string;
}

// biome-ignore lint/correctness/noUnusedVariables: <NOT IMPORTANT>
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Server-side environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly NODE_ENV: "development" | "production" | "test";
    }
  }
}

export {};
