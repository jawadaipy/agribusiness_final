import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "vercel",
    inlineDynamicImports: true,
  },
  tanstackStart: {
    server: { entry: "server" },
  },
} as Parameters<typeof defineConfig>[0]);
