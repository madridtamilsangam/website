import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// base must match the GitHub Pages repo path: https://madridtamilsangam.github.io/website/
export default defineConfig({
  base: "/",
  plugins: [react()],
});
