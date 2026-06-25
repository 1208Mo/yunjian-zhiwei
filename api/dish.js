// Vercel Serverless Function: 补全单道菜的做法详情（阶段二，非流式）
import {
    callErnie,
    parseJsonLoose,
    buildDishDetailPrompt,
} from "./_lib/qianfan.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
    }
    try {
        const { system, user } = buildDishDetailPrompt(req.body);
        const raw = await callErnie(system, user);
        res.status(200).json({ dish: parseJsonLoose(raw) });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
}
