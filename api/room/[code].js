// Vercel Serverless: 读房间（GET /api/room/:code）
import { getRoom } from "../_lib/room.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
    }
    try {
        res.status(200).json(await getRoom(req.query.code));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
}
