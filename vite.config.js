import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 静态部署用相对路径，便于挂到任意子目录/托管服务
export default defineConfig({
    base: "./",
    plugins: [react()],
    server: {
        // 开发时把 /api 转发到本地后端，避免跨域
        proxy: {
            "/api": {
                target: "http://localhost:8787",
                changeOrigin: true,
            },
        },
    },
});
