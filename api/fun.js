// Vercel Serverless Function: 趣味荐餐（盲盒/星座/五行）
import { callErnie, parseJsonLoose, buildFunPrompt } from "./_lib/qianfan.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
    }

    try {
        const { system, user } = buildFunPrompt(req.body);
        const content = await callErnie(system, user);
        const result = parseJsonLoose(content);
        res.status(200).json({ source: "ai", result });
    } catch (err) {
        res.status(503).json({ error: err.message });
    }
}
