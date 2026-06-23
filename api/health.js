// Vercel Serverless Function: 健康检查
export default function handler(_req, res) {
    res.status(200).json({
        ok: true,
        model: process.env.QIANFAN_MODEL || "ernie-3.5-8k",
        hasKey: Boolean(process.env.QIANFAN_API_KEY),
    });
}
