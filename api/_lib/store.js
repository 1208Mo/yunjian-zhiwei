// Upstash Redis（REST API）的轻量封装，供「TA来挑菜」分享房间读写。
// 用 REST 而非 SDK：无需额外依赖，本地 Express 与 Vercel Serverless 通用。

// 注意：在函数内读取环境变量，而非模块顶层。
// 因为本地 Express 通过 dotenv.config() 注入 env，其执行晚于本模块的 import。
function cfg() {
    const BASE = process.env.UPSTASH_REDIS_REST_URL;
    const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!BASE || !TOKEN) {
        throw new Error(
            "缺少 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 环境变量",
        );
    }
    return { BASE, TOKEN };
}

async function command(path) {
    const { BASE, TOKEN } = cfg();
    const res = await fetch(`${BASE}/${path}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`存储服务返回 ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data.result;
}

// 存 JSON 值，可选过期秒数（默认 7 天，房间数据无需长期保留）
export async function kvSetJson(key, value, ttlSeconds = 7 * 24 * 3600) {
    const { BASE, TOKEN } = cfg();
    const body = JSON.stringify(value);
    // 用 POST 传 value，避免特殊字符进 URL；EX 设过期
    const res = await fetch(
        `${BASE}/set/${encodeURIComponent(key)}?EX=${ttlSeconds}`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                "Content-Type": "text/plain",
            },
            body,
        },
    );
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`存储服务返回 ${res.status}: ${text}`);
    }
    return true;
}

// 读 JSON 值，不存在返回 null
export async function kvGetJson(key) {
    const raw = await command(`get/${encodeURIComponent(key)}`);
    if (raw == null) {
        return null;
    }
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// 生成短分享码（6 位，避免易混字符）
export function makeShareCode() {
    const chars = "ACDEFGHJKLMNPQRSTUVWXY3456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
