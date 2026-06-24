// Vercel Serverless: 提交某餐的选择（POST /api/room/:code/pick）
import { submitPick } from "../../_lib/room.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
    }
    try {
        res.status(200).json(await submitPick(req.query.code, req.body));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
}
