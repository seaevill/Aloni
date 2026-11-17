// Injected at build time from app/package.json (vite.config.ts `define`). Kept out of config.ts
// because vite.config.ts imports config.ts before `define` exists.
export const APP_VERSION: string = __APP_VERSION__;
