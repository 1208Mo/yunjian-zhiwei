// 前端 API 客户端：调用后端代理（千帆 ERNIE）。
// 失败时抛错，由调用方决定是否回落到本地规则引擎。

// 部署到纯静态托管（无后端）时，VITE_API_BASE 为空则请求同源 /api，
// 拿不到后端会自动走本地回落。
const API_BASE = import.meta.env.VITE_API_BASE || "";

async function postJson(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `请求失败 ${res.status}`);
    }
    return res.json();
}

export function fetchAiMenu(payload) {
    return postJson("/api/menu", payload);
}

export function fetchAiFun(payload) {
    return postJson("/api/fun", payload);
}
