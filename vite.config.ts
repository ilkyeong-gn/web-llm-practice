import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    // 크고 복잡한 파일을 처리하기 위한 설정
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          webllm: ["@mlc-ai/web-llm"],
        },
      },
    },
  },
});
