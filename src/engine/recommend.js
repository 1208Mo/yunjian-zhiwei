// 推荐引擎：根据用户上下文为每道菜打分，并组合成均衡的菜单方案。
// 作为大模型不可用时的本地回落方案，也用于趣味荐餐的本地计算。

// 取菜谱所有食材名（ingredients 为 [{name, amount, unit}]）
function ingredientNames(recipe) {
    return recipe.ingredients.map((i) => i.name);
}

// 可选厨具清单（用于 UI 展示与匹配）
export const COOKWARE_OPTIONS = [
    "炒锅",
    "汤锅",
    "蒸锅",
    "煎锅",
    "烤箱",
    "高压锅",
    "电饭煲",
    "微波炉",
];

// 各类厨具的「可替代关系」：键为菜谱所需厨具，值为能胜任它的用户厨具。
// 例如炒锅也能煎、能煮汤；汤锅/高压锅/电饭煲都能煮。
const COOKWARE_SUBSTITUTES = {
    炒锅: ["炒锅", "煎锅"],
    煎锅: ["煎锅", "炒锅"],
    汤锅: ["汤锅", "炒锅", "高压锅", "电饭煲"],
    蒸锅: ["蒸锅", "电饭煲", "高压锅"],
    烤箱: ["烤箱"],
    电饭煲: ["电饭煲"],
};

/**
 * 从菜名与做法步骤推断这道菜需要哪些厨具。
 * 同时适用于本地菜库与 AI 生成的菜（两者都有 name/steps）。
 * 返回去重后的所需厨具数组；凉拌等免烹饪菜返回 []。
 * @param {object} recipe 菜谱
 * @returns {string[]}
 */
export function inferCookware(recipe) {
    const text = `${recipe.name || ""} ${(recipe.steps || []).join(" ")}`;
    const needs = new Set();

    if (/蒸/.test(text)) needs.add("蒸锅");
    if (/烤|焗/.test(text)) needs.add("烤箱");
    if (/煎|烙/.test(text)) needs.add("煎锅");
    if (/炒|爆|煸|滑炒|翻炒|回锅/.test(text)) needs.add("炒锅");
    if (/炖|煮|汤|焯|煲|白灼|烧开|下锅|汆/.test(text)) needs.add("汤锅");
    if (/焖饭|电饭煲|煮饭|蒸饭/.test(text)) needs.add("电饭煲");

    return [...needs];
}

/**
 * 在用户已选厨具下，判断这道菜能否做。
 * 每一项所需厨具，只要用户拥有其任一可替代厨具即视为满足。
 * @param {object} recipe 菜谱
 * @param {string[]} ownedCookware 用户已选厨具
 * @returns {boolean}
 */
export function canCookWith(recipe, ownedCookware) {
    const needs = inferCookware(recipe);
    if (!needs.length) return true; // 免烹饪（凉拌等）
    const owned = new Set(ownedCookware);
    return needs.every((need) => {
        const subs = COOKWARE_SUBSTITUTES[need] || [need];
        return subs.some((s) => owned.has(s));
    });
}

/**
 * 为单道菜打分。
 * @param {object} recipe 菜谱
 * @param {object} ctx 用户上下文 { ingredients, clearout, maxTime, tastes, healthGoals, elementPref }
 * @returns {{ score:number, reasons:string[], matched:string[] }}
 */
export function scoreRecipe(recipe, ctx) {
    const {
        ingredients = [],
        clearout = [],
        maxTime,
        tastes = [],
        healthGoals = [],
        elementPref,
    } = ctx;

    let score = 0;
    const reasons = [];
    const names = ingredientNames(recipe);

    // 食材匹配：菜里用到了用户已有食材
    const owned = ingredients.map((s) => s.trim()).filter(Boolean);
    const matched = names.filter((ing) =>
        owned.some((o) => ing.includes(o) || o.includes(ing)),
    );
    if (owned.length) {
        score += matched.length * 25;
        if (matched.length) {
            reasons.push(`用到你的${matched.join("、")}`);
        }
    }

    // 清仓优先：快过期食材命中给更高权重
    const clearItems = clearout.map((s) => s.trim()).filter(Boolean);
    const clearMatched = names.filter((ing) =>
        clearItems.some((o) => ing.includes(o) || o.includes(ing)),
    );
    if (clearMatched.length) {
        score += clearMatched.length * 40;
        reasons.push(`清仓 ${clearMatched.join("、")}，减少浪费`);
    }

    // 耗时限制
    if (maxTime && recipe.time > maxTime) {
        score -= (recipe.time - maxTime) * 1.5;
    } else if (maxTime) {
        score += 8;
    }

    // 口味偏好
    if (tastes.length) {
        const hit = recipe.tags.filter((t) => tastes.includes(t));
        score += hit.length * 15;
        if (hit.length) {
            reasons.push(`${hit.join("、")}口味`);
        }
    }

    // 健康目标
    if (healthGoals.length) {
        const hit = recipe.health.filter((h) => healthGoals.includes(h));
        score += hit.length * 18;
        if (hit.length) {
            reasons.push(hit.join("、"));
        }
    }

    // 五行 / 星座口味倾向
    if (elementPref && recipe.element === elementPref) {
        score += 12;
    }

    // 轻微随机，保证每次生成有新鲜感
    score += Math.random() * 8;

    return { score, reasons, matched };
}

/**
 * 组合一套搭配均衡的菜单（控制荤素汤主食比例）。
 * @returns {Array<{ r:object, score:number, reasons:string[] }>}
 */
export function buildMenu(recipes, ctx, serves) {
    // 厨具硬性过滤：用户限定了厨具时，剔除做不了的菜
    const cookware = ctx.cookware || [];
    const available = cookware.length
        ? recipes.filter((r) => canCookWith(r, cookware))
        : recipes;

    const scored = available
        .map((r) => ({ r, ...scoreRecipe(r, ctx) }))
        .sort((a, b) => b.score - a.score);

    const dishCount =
        serves <= 1 ? 2 : serves <= 2 ? 3 : serves <= 4 ? 4 : 5;

    const picked = [];
    const catCount = {};

    for (const item of scored) {
        const c = item.r.category;
        catCount[c] = catCount[c] || 0;

        // 控制各类别数量，保证整体搭配均衡
        if (c === "荤菜" && catCount[c] >= Math.ceil(dishCount / 2)) {
            continue;
        }
        if (c === "汤" && catCount[c] >= 1) {
            continue;
        }
        if (c === "主食" && catCount[c] >= 1) {
            continue;
        }

        picked.push(item);
        catCount[c] += 1;
        if (picked.length >= dishCount) {
            break;
        }
    }

    return picked;
}

/**
 * 一次生成多套菜单方案。
 */
export function genMultipleMenus(recipes, ctx, serves, n = 3) {
    const labels = ["主推方案", "清爽备选", "今日惊喜"];
    const menus = [];
    for (let i = 0; i < n; i += 1) {
        menus.push({
            label: labels[i] || `方案${i + 1}`,
            dishes: buildMenu(recipes, ctx, serves),
        });
    }
    return menus;
}
