// 云间知味本地后端：封装千帆 ERNIE 调用，密钥只留在服务端。
// 开发时由 Vite 代理把 /api 转发到本服务；生产环境用 Vercel Serverless（api/*.js）。
// 业务逻辑与 Vercel 函数共用 api/_lib/qianfan.js，保持一致。
import express from "express";
import dotenv from "dotenv";
import {
    callErnie,
    parseJsonLoose,
    buildMenuPrompt,
    buildFunPrompt,
} from "../api/_lib/qianfan.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 8787;

app.post("/api/menu", async (req, res) => {
    try {
        const { system, user } = buildMenuPrompt(req.body);
        const content = await callErnie(system, user);
        res.json({ source: "ai", menu: parseJsonLoose(content) });
    } catch (err) {
        res.status(503).json({ error: err.message });
    }
});

app.post("/api/fun", async (req, res) => {
    try {
        const { system, user } = buildFunPrompt(req.body);
        const content = await callErnie(system, user);
        res.json({ source: "ai", result: parseJsonLoose(content) });
    } catch (err) {
        res.status(503).json({ error: err.message });
    }
});

app.get("/api/health", (_req, res) => {
    res.json({
        ok: true,
        model: process.env.QIANFAN_MODEL || "ernie-3.5-8k",
        hasKey: Boolean(process.env.QIANFAN_API_KEY),
    });
});

app.listen(PORT, () => {
    console.log(`云间知味 API 已启动: http://localhost:${PORT}`);
});
