// 推荐引擎：根据用户上下文为每道菜打分，并组合成均衡的菜单方案。
// 作为大模型不可用时的本地回落方案，也用于趣味荐餐的本地计算。

// 取菜谱所有食材名（ingredients 为 [{name, amount, unit}]）
function ingredientNames(recipe) {
    return recipe.ingredients.map((i) => i.name);
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
    const scored = recipes
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
