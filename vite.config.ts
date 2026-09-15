import { resolve } from "node:path"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/client/routes",
      generatedRouteTree: "./src/client/routeTree.gen.ts",
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src/client"),
      "@server": resolve(import.meta.dirname, "src/server"),
    },
  },
  server: {
    proxy: {
      "/trpc": "http://localhost:3000",
    },
  },
})
