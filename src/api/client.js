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

// 流式请求 SSE 接口。
// onDelta(text)：每收到一块增量文本回调（用于展示「正在生成」进度）。
// 返回 done 事件里的数据对象（如 {menu} 或 {result}）。
// 整体超时 timeoutMs（默认 25s），超时抛出带「超时」字样的错误，由调用方兜底。
async function streamSse(path, body, onDelta, timeoutMs = 25000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (e) {
        clearTimeout(timer);
        if (e?.name === "AbortError") {
            throw new Error("生成超时，请重试");
        }
        throw e;
    }
    if (!res.ok || !res.body) {
        clearTimeout(timer);
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `请求失败 ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result = null;
    let errMsg = "";

    const handleEvent = (block) => {
        let event = "message";
        let dataLine = "";
        for (const line of block.split("\n")) {
            if (line.startsWith("event:")) {
                event = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
                dataLine += line.slice(5).trim();
            }
        }
        if (!dataLine) {
            return;
        }
        let payload;
        try {
            payload = JSON.parse(dataLine);
        } catch {
            return;
        }
        if (event === "delta") {
            onDelta?.(payload.text || "");
        } else if (event === "done") {
            result = payload;
        } else if (event === "error") {
            errMsg = payload.error || "生成失败";
        }
    };

    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            // SSE 以空行分隔事件块
            const blocks = buffer.split("\n\n");
            buffer = blocks.pop() || "";
            for (const block of blocks) {
                if (block.trim()) {
                    handleEvent(block);
                }
            }
        }
        if (buffer.trim()) {
            handleEvent(buffer);
        }
    } catch (e) {
        if (e?.name === "AbortError") {
            throw new Error("生成超时，请重试");
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }

    if (errMsg) {
        throw new Error(errMsg);
    }
    if (!result) {
        throw new Error("未收到生成结果");
    }
    return result;
}

// 流式生成今日菜单，返回 { menu }
export function streamAiMenu(payload, onDelta) {
    return streamSse("/api/menu", payload, onDelta);
}

// 流式趣味荐餐，返回 { result }
export function streamAiFun(payload, onDelta) {
    return streamSse("/api/fun", payload, onDelta);
}

// 流式生成「点菜单」（早/中/晚三餐候选），返回 { menu }
export function streamAiPick(payload, onDelta) {
    return streamSse("/api/pick", payload, onDelta);
}

// 拍照识别食材：上传 base64 data URL，返回识别出的食材列表
export function fetchVisionIngredients(imageDataUrl) {
    return postJson("/api/vision", { image: imageDataUrl });
}

// 「TA来挑菜」分享房间
// 建/更新房间：存菜单，返回 { code }。传 code 用固定暗号，覆盖更新。
export function createRoom(menu, from, code) {
    return postJson("/api/room", { menu, from, code });
}

// 读房间：返回 { code, from, menu, picks, updatedAt }
async function getJson(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `请求失败 ${res.status}`);
    }
    return res.json();
}

export function fetchRoom(code) {
    return getJson(`/api/room/${encodeURIComponent(code)}`);
}

// 提交某一餐的选择
export function submitRoomPick(code, meal, dishId) {
    return postJson(`/api/room/${encodeURIComponent(code)}/pick`, {
        meal,
        dishId,
    });
}
