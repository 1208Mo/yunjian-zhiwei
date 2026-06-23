// Vercel Serverless Function: 生成今日菜单
import { callErnie, parseJsonLoose, buildMenuPrompt } from "./_lib/qianfan.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
    }

    try {
        const { system, user } = buildMenuPrompt(req.body);
        const content = await callErnie(system, user);
        const menu = parseJsonLoose(content);
        res.status(200).json({ source: "ai", menu });
    } catch (err) {
        // 失败回 503，前端回落到本地规则引擎
        res.status(503).json({ error: err.message });
    }
}
