// 云间知味本地后端：封装大模型（百度智能云千帆 ERNIE）调用，密钥只留在服务端。
// 开发时由 Vite 代理把 /api 转发到本服务；生产环境用 Vercel Serverless（api/*.js）。
// 业务逻辑与 Vercel 函数共用 api/_lib/qianfan.js，保持一致。
import express from "express";
import dotenv from "dotenv";
import {
    callErnie,
    callErnieStream,
    callErnieVision,
    parseJsonLoose,
    buildMenuListPrompt,
    buildDishDetailPrompt,
    buildFunPrompt,
    buildVisionPrompt,
    buildPickPrompt,
} from "../api/_lib/qianfan.js";
import { createRoom, getRoom, submitPick } from "../api/_lib/room.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "8mb" }));

const PORT = process.env.PORT || 8787;

// 以 SSE 流式把大模型增量文本推给前端，结束时下发解析后的完整 JSON。
// event: delta  -> { text }      逐块文本
// event: done   -> { result }    解析后的最终对象
// event: error  -> { error }     失败信息
async function streamJson(res, system, user, resultKey) {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        const full = await callErnieStream(system, user, (delta) => {
            send("delta", { text: delta });
        });
        send("done", { [resultKey]: parseJsonLoose(full) });
    } catch (err) {
        send("error", { error: err.message });
    } finally {
        res.end();
    }
}

app.post("/api/menu", async (req, res) => {
    const { system, user } = buildMenuListPrompt(req.body);
    await streamJson(res, system, user, "menu");
});

// 阶段二：补全单道菜的做法详情
app.post("/api/dish", async (req, res) => {
    try {
        const { system, user } = buildDishDetailPrompt(req.body);
        const raw = await callErnie(system, user);
        res.json({ dish: parseJsonLoose(raw) });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

app.post("/api/fun", async (req, res) => {
    const { system, user } = buildFunPrompt(req.body);
    await streamJson(res, system, user, "result");
});

app.post("/api/pick", async (req, res) => {
    const { system, user } = buildPickPrompt(req.body);
    await streamJson(res, system, user, "menu");
});

app.post("/api/vision", async (req, res) => {
    try {
        const { image } = req.body || {};
        if (!image) {
            res.status(400).json({ error: "缺少 image 字段" });
            return;
        }
        const { system, user } = buildVisionPrompt();
        const content = await callErnieVision(system, user, image);
        res.json({ source: "ai", result: parseJsonLoose(content) });
    } catch (err) {
        res.status(503).json({ error: err.message });
    }
});

// 「TA来挑菜」分享房间
app.post("/api/room", async (req, res) => {
    try {
        res.json(await createRoom(req.body));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

app.get("/api/room/:code", async (req, res) => {
    try {
        res.json(await getRoom(req.params.code));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

app.post("/api/room/:code/pick", async (req, res) => {
    try {
        res.json(await submitPick(req.params.code, req.body));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
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
