// 把不同来源（AI / 本地规则引擎 / 投票）的菜品归一成统一结构，
// 供 DishCard、详情页、采购清单复用。

let autoId = 100000;

// 规则引擎产出的菜谱已含完整字段；AI 产出可能缺字段，这里补齐。
export function normalizeDish(raw) {
    const r = raw.r || raw;
    return {
        id: r.id ?? (autoId += 1),
        name: r.name || "未命名菜品",
        emoji: r.emoji || "🍽️",
        category: r.category || "其他",
        time: r.time || 0,
        tags: r.tags || [],
        health: r.health || [],
        prep: Array.isArray(r.prep) ? r.prep : r.prep ? [r.prep] : [],
        ingredients: r.ingredients || [],
        seasoning: r.seasoning || [],
        sauce: r.sauce || [],
        steps: Array.isArray(r.steps) ? r.steps : r.steps ? [r.steps] : [],
        tips: r.tips || "",
        // 推荐理由：优先 AI 的 reason，其次规则引擎的 reasons 数组
        reasons: raw.reasons || (r.reason ? [r.reason] : []),
    };
}

export function normalizeMenu(menu) {
    return {
        label: menu.label || menu.title || "今日菜单",
        summary: menu.summary || "",
        dishes: (menu.dishes || []).map(normalizeDish),
    };
}

// 按目标人数缩放备料用量（基准为 recipe.baseServes，AI 结果默认按请求人数已标定）
export function scaleAmount(amount, baseServes, targetServes) {
    if (!baseServes || baseServes === targetServes) {
        return amount;
    }
    const scaled = (amount * targetServes) / baseServes;
    // 保留一位小数，整数则去掉小数
    return Math.round(scaled * 10) / 10;
}

// 汇总整桌采购清单：同名食材累加用量
export function aggregateShopping(dishes, baseServesMap = {}, targetServes) {
    const map = new Map();
    dishes.forEach((d) => {
        const base = baseServesMap[d.id];
        d.ingredients.forEach((ing) => {
            const amount =
                base && targetServes
                    ? scaleAmount(ing.amount, base, targetServes)
                    : ing.amount;
            const key = `${ing.name}__${ing.unit}`;
            const prev = map.get(key);
            if (prev) {
                prev.amount += amount;
            } else {
                map.set(key, {
                    name: ing.name,
                    amount,
                    unit: ing.unit,
                });
            }
        });
    });
    return [...map.values()].map((i) => ({
        ...i,
        amount: Math.round(i.amount * 10) / 10,
    }));
}
