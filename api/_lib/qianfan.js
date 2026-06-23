// 千帆 ERNIE 调用与 prompt 构造的共享逻辑。
// 同时被 Vercel Serverless 函数（api/*.js）和本地 Express 服务（server/index.js）复用。
import { RECIPES } from "../../src/data/recipes.js";

const QIANFAN_URL = "https://qianfan.baidubce.com/v2/chat/completions";

// 给模型的菜谱清单（精简，作为可选参考池）
const RECIPE_BRIEF = RECIPES.map(
    (r) => `${r.name}(${r.category}/${r.tags.join("、")})`,
).join("，");

// 调用千帆，强制 JSON 输出
export async function callErnie(systemPrompt, userPrompt) {
    const apiKey = process.env.QIANFAN_API_KEY;
    const model = process.env.QIANFAN_MODEL || "ernie-3.5-8k";

    if (!apiKey) {
        throw new Error("缺少 QIANFAN_API_KEY 环境变量");
    }

    const res = await fetch(QIANFAN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.8,
            response_format: { type: "json_object" },
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`千帆返回 ${res.status}: ${text}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
}

// 从模型返回里安全解析 JSON
export function parseJsonLoose(text) {
    try {
        return JSON.parse(text);
    } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
        throw new Error("模型未返回合法 JSON");
    }
}

// 构造「今日菜单」prompt
export function buildMenuPrompt(body) {
    const {
        ingredients = [],
        clearout = [],
        serves = 2,
        maxTime = 30,
        tastes = [],
        healthGoals = [],
    } = body || {};

    const system = [
        "你是「云间知味」的 AI 营养师兼大厨，为中国年轻人决定每天吃什么。",
        "请基于用户输入生成 1 套搭配均衡的今日菜单（荤素搭配，可含汤/主食）。",
        "必须严格输出 JSON，结构如下：",
        '{"title":string,"summary":string,"dishes":[{"name":string,"emoji":string,"category":"荤菜|素菜|汤|主食","time":number,"tags":[string],"reason":string,"ingredients":[{"name":string,"amount":number,"unit":string}],"seasoning":[{"name":string,"amount":number,"unit":string}],"steps":[string],"tips":string}]}',
        "要求：1) 优先使用用户现有食材，特别优先消耗冰箱清仓食材；2) 备料用量要贴合用餐人数；3) reason 说明为什么推荐这道；4) summary 一句话点评整桌搭配。",
        `可参考的家常菜池（也可发挥）：${RECIPE_BRIEF}`,
    ].join("\n");

    const user = [
        `用餐人数：${serves} 人`,
        `现有食材：${ingredients.join("、") || "未提供"}`,
        `冰箱清仓(快过期，优先用)：${clearout.join("、") || "无"}`,
        `单道菜最长耗时：${maxTime} 分钟`,
        `口味偏好：${tastes.join("、") || "不限"}`,
        `健康目标：${healthGoals.join("、") || "无"}`,
    ].join("\n");

    return { system, user };
}

// 构造「趣味荐餐」prompt
export function buildFunPrompt(body) {
    const { mode, constellation, element, luckyColor } = body || {};

    const system = [
        "你是「云间知味」的趣味荐餐官，用轻松有梗的语气为用户推荐 2 道菜。",
        "必须严格输出 JSON：",
        '{"title":string,"line":string,"dishes":[{"name":string,"emoji":string,"category":string,"time":number,"tags":[string],"reason":string,"ingredients":[{"name":string,"amount":number,"unit":string}],"seasoning":[{"name":string,"amount":number,"unit":string}],"steps":[string],"tips":string}]}',
        "line 要结合主题写一句有记忆点的开场白。",
    ].join("\n");

    let theme;
    if (mode === "constellation") {
        theme = `主题：${constellation}星座今日荐餐，结合该星座性格推荐。`;
    } else if (mode === "element") {
        theme = `主题：五行「${element}」当道，按对应口味（如火=苦辣、水=咸鲜、木=清酸、土=甘甜、金=辛香）推荐。`;
    } else {
        theme = `主题：菜单盲盒，今日幸运色【${luckyColor}】，随机但合理地开出惊喜组合。`;
    }

    return { system, user: theme };
}
