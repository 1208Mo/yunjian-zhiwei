// Vercel Serverless Function: 点菜单（早/中/晚三餐候选）SSE 流式输出
import {
    callErnieStream,
    parseJsonLoose,
    buildPickPrompt,
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
        const { system, user } = buildPickPrompt(req.body);
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
