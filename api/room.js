// Vercel Serverless: 建房间（存菜单，返回分享码）
import { createRoom } from "./_lib/room.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
    }
    try {
        res.status(200).json(await createRoom(req.body));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
}
