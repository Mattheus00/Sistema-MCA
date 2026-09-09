import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
      // Apenas `src/lib` entra no denominador da meta de linhas (>= 60%).
      include: ["src/lib/**/*.ts"],
      // Mocks inflariam o denominador sem testes unitários equivalentes.
      exclude: ["src/lib/mockApi.ts", "src/lib/mockLivroCaixa.ts"],
      reporter: ["text", "html"],
      thresholds: {
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Quando VITE_API_URL estiver vazio, /api é repassado ao backend (evita CORS)
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
