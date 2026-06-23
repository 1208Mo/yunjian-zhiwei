import { useEffect, useMemo } from "react";
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

            <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">
                    🛒 采购清单
                    <span className="text-xs text-gray-400 font-normal ml-2">
                        已按整桌合并用量
                    </span>
                </h3>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {shoppingList.map((i) => (
                        <li
                            key={`${i.name}-${i.unit}`}
                            className="flex items-center justify-between text-sm border-b border-gray-50 pb-1.5"
                        >
                            <span className="text-gray-700">{i.name}</span>
                            <span className="text-brand-700 font-medium">
                                {i.amount}
                                {i.unit}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            <KaiFanCard menu={menu} serves={serves} />
        </div>
    );
}
