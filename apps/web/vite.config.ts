import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@jarvis/core": path.resolve(
        __dirname,
        "../../packages/core/src/index.ts"
      ),
    },
  },
});
