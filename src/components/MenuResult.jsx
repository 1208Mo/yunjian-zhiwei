import { useEffect, useMemo, useState } from "react";
import SectionTitle from "./SectionTitle.jsx";
import DishCard from "./DishCard.jsx";
import KaiFanCard from "./KaiFanCard.jsx";
import { registerDishes } from "../utils/dishRegistry.js";

// 单套菜单的完整展示：菜品列表 + 采购清单（带用量）+ 开饭卡。
export default function MenuResult({ menu, serves }) {
    const dishes = menu.dishes;

    // 登记菜品，供详情页按 id 取用
    useEffect(() => {
        registerDishes(dishes);
    }, [dishes]);

    // 汇总采购清单：同名同单位食材累加用量
    const shoppingList = useMemo(() => {
        const map = new Map();
        dishes.forEach((d) => {
            d.ingredients.forEach((ing) => {
                const key = `${ing.name}__${ing.unit}`;
                const prev = map.get(key);
                if (prev) {
                    prev.amount += ing.amount;
                } else {
                    map.set(key, { ...ing });
                }
            });
        });
        return [...map.values()].map((i) => ({
            ...i,
            amount: Math.round(i.amount * 10) / 10,
        }));
    }, [dishes]);

    // 采购清单勾选态，按当前菜单签名持久化（不同菜单互不影响）
    const listKey = useMemo(
        () =>
            "yjzw.shop.v1:" +
            shoppingList.map((i) => `${i.name}_${i.unit}`).join("|"),
        [shoppingList],
    );
    const [checked, setChecked] = useState(() => new Set());

    useEffect(() => {
        try {
            const raw = localStorage.getItem(listKey);
            setChecked(new Set(raw ? JSON.parse(raw) : []));
        } catch {
            setChecked(new Set());
        }
    }, [listKey]);

    const toggleItem = (key) => {
        setChecked((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            try {
                localStorage.setItem(listKey, JSON.stringify([...next]));
            } catch {
                // 忽略存储异常
            }
            return next;
        });
    };

    const itemKey = (i) => `${i.name}__${i.unit}`;
    const doneCount = shoppingList.filter((i) => checked.has(itemKey(i))).length;
    const allDone = shoppingList.length > 0 && doneCount === shoppingList.length;

    const resetChecked = () => {
        setChecked(new Set());
        try {
            localStorage.removeItem(listKey);
        } catch {
            // 忽略
        }
    };

    // 复制采购清单为纯文本（未买的在前，已买的打勾在后）
    const [copied, setCopied] = useState(false);
    const copyList = async () => {
        const lines = [`🛒 采购清单（${menu.label}）`];
        shoppingList.forEach((i) => {
            const mark = checked.has(itemKey(i)) ? "✅" : "▢";
            lines.push(`${mark} ${i.name} ${i.amount}${i.unit}`);
        });
        try {
            await navigator.clipboard.writeText(lines.join("\n"));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // 复制失败静默
        }
    };

    return (
        <div className="space-y-3">
            <SectionTitle
                icon="📋"
                title={menu.label}
                sub={
                    menu.summary ||
                    `${dishes.length} 道菜 · 适合 ${serves} 人`
                }
            />

            {dishes.map((d, i) => (
                <DishCard key={d.id} item={d} delay={i * 60} />
            ))}

            {shoppingList.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">
                        🛒 采购清单
                        <span className="text-xs text-gray-400 font-normal ml-2">
                            {doneCount}/{shoppingList.length} 已备齐
                        </span>
                    </h3>
                    <div className="flex items-center gap-1.5">
                        {doneCount > 0 && (
                            <button
                                onClick={resetChecked}
                                className="text-xs text-gray-400 px-2 py-1 rounded-md active:bg-gray-100"
                            >
                                重置
                            </button>
                        )}
                        <button
                            onClick={copyList}
                            className="text-xs text-brand font-medium px-2.5 py-1 rounded-md bg-orange-50 active:bg-orange-100"
                        >
                            {copied ? "已复制" : "复制清单"}
                        </button>
                    </div>
                </div>

                {allDone && (
                    <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3">
                        🎉 食材都备齐啦，可以开做了！
                    </p>
                )}

                <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {shoppingList.map((i) => {
                        const k = itemKey(i);
                        const done = checked.has(k);
                        return (
                            <li key={`${i.name}-${i.unit}`}>
                                <button
                                    onClick={() => toggleItem(k)}
                                    className="w-full flex items-center gap-2 text-sm py-1.5 border-b border-gray-50 active:bg-gray-50 rounded"
                                >
                                    <span
                                        className={
                                            "w-4 h-4 shrink-0 rounded border flex items-center justify-center text-[10px] leading-none transition " +
                                            (done
                                                ? "bg-brand border-brand text-white"
                                                : "border-gray-300 text-transparent")
                                        }
                                    >
                                        ✓
                                    </span>
                                    <span
                                        className={
                                            "flex-1 text-left " +
                                            (done
                                                ? "text-gray-300 line-through"
                                                : "text-gray-700")
                                        }
                                    >
                                        {i.name}
                                    </span>
                                    <span
                                        className={
                                            "font-medium " +
                                            (done
                                                ? "text-gray-300 line-through"
                                                : "text-brand-700")
                                        }
                                    >
                                        {i.amount}
                                        {i.unit}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
            )}

            <KaiFanCard menu={menu} serves={serves} />
        </div>
    );
}
