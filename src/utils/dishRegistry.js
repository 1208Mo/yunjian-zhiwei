// 菜品注册表：列表页渲染时登记菜品，详情页按 id 取用。
// 解决 AI 动态生成的菜品没有持久数据源、详情页无法查到的问题。
// 同时持久化到 localStorage：补全过做法的菜刷新/返回后不丢，避免重复生成。
const STORE_KEY = "yjzw.dishRegistry.v1";
const MAX_KEEP = 200; // 最多保留多少道，防止 localStorage 无限增长

const registry = new Map();

// 启动时从 localStorage 恢复
try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
            arr.forEach((d) => d && d.id != null && registry.set(String(d.id), d));
        }
    }
} catch {
    // 忽略读取失败
}

function persist() {
    try {
        // 只保留最近的 MAX_KEEP 条
        const all = [...registry.values()];
        const keep = all.slice(-MAX_KEEP);
        localStorage.setItem(STORE_KEY, JSON.stringify(keep));
    } catch {
        // 忽略写入失败（隐私模式/超额）
    }
}

export function registerDishes(dishes) {
    dishes.forEach((d) => {
        const key = String(d.id);
        const prev = registry.get(key);
        // 若已缓存且已有做法详情(steps)，不要用菜名清单的「无 steps 版本」覆盖它，
        // 否则会冲掉已补全的做法，导致再次进详情页重复生成。
        // 仅合并新来的非空字段，保留已有的 steps/ingredients 等。
        if (prev && prev.steps && prev.steps.length > 0) {
            registry.set(key, { ...prev, ...stripEmpty(d) });
        } else {
            registry.set(key, prev ? { ...prev, ...d } : d);
        }
    });
    persist();
}

// 去掉对象里的空数组/空字符串字段，避免覆盖已有的有效值
function stripEmpty(obj) {
    const out = {};
    Object.entries(obj).forEach(([k, v]) => {
        if (Array.isArray(v) && v.length === 0) {
            return;
        }
        if (v === "" || v == null) {
            return;
        }
        out[k] = v;
    });
    return out;
}

// 合并更新一道菜（如阶段二补全详情后），保留原有字段
export function upsertDish(dish) {
    const key = String(dish.id);
    registry.set(key, { ...registry.get(key), ...dish });
    persist();
}

export function getDish(id) {
    return registry.get(String(id));
}

// 正在补全详情的请求去重：同一道菜的并发请求只发一次，
// 其余复用同一个 Promise（解决 StrictMode 双跑 + 重复点击导致的多次 /api/dish）。
const inflight = new Map();

// fetcher 是真正发请求的函数，返回补全后的完整 dish 对象。
// 命中缓存（已有 steps）直接返回；否则发一次请求并写回 registry。
export function ensureDishDetail(id, fetcher) {
    const key = String(id);
    const cached = registry.get(key);
    if (cached && cached.steps && cached.steps.length > 0) {
        return Promise.resolve(cached);
    }
    if (inflight.has(key)) {
        return inflight.get(key);
    }
    const p = Promise.resolve(fetcher())
        .then((detail) => {
            upsertDish(detail);
            return registry.get(key);
        })
        .finally(() => {
            inflight.delete(key);
        });
    inflight.set(key, p);
    return p;
}
