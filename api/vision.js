// Vercel Serverless Function: 拍照识别冰箱食材
import {
    callErnieVision,
    parseJsonLoose,
    buildVisionPrompt,
} from "./_lib/qianfan.js";

export const config = {
    api: { bodyParser: { sizeLimit: "8mb" } },
};

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
    }

    try {
        const { image } = req.body || {};
        if (!image) {
            res.status(400).json({ error: "缺少 image 字段" });
            return;
        }
        const { system, user } = buildVisionPrompt();
        const content = await callErnieVision(system, user, image);
        const result = parseJsonLoose(content);
        res.status(200).json({ source: "ai", result });
    } catch (err) {
        res.status(503).json({ error: err.message });
    }
}
