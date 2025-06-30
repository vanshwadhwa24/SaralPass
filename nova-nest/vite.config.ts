import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/crossings': 'http://localhost:5000',
      '/stations': 'http://localhost:5000',
      '/trains': 'http://localhost:5000',
      '/crossing-alert': 'http://localhost:5000',
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
