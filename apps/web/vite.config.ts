import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  base: "./",

  resolve: {
    alias: {
      "@jarvis/core": path.resolve(
        __dirname,
        "../../packages/core/src/index.ts"
      ),
    },
  },
});
