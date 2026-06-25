// Vercel Serverless Function: 生成今日菜单的「菜名清单」（阶段一，SSE 流式）
// 只出菜名+emoji+分类+耗时+理由，快速返回；做法详情由 /api/dish 按菜名补全。
import {
    callErnieStream,
    parseJsonLoose,
    buildMenuListPrompt,
} from "./_lib/qianfan.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    const send = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        const { system, user } = buildMenuListPrompt(req.body);
        const full = await callErnieStream(system, user, (delta) => {
            send("delta", { text: delta });
        });
        send("done", { menu: parseJsonLoose(full) });
    } catch (err) {
        send("error", { error: err.message });
    } finally {
        res.end();
    }
}
