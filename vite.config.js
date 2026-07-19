import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const ignoredRuntimeData = [
  "**/.mister-companion-vaultkit-dev-data/**",
  "**/MiSTerCompanionVaultKitData/**",
  "**/Data/**",
  "**/Themes/**",
  "**/Tools/**",
  "**/release/**",
  "**/dist-electron/**",
];

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    watch: {
      ignored: ignoredRuntimeData,
    },
  },
});
