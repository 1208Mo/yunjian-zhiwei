import { useNavigate, useParams } from "react-router-dom";
import { getDish } from "../utils/dishRegistry.js";

// 食材/调味料用量表
function AmountTable({ title, items, accent }) {
    if (!items || items.length === 0) {
        return null;
    }
    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">{title}</h3>
            <ul className="divide-y divide-gray-50">
                {items.map((it, i) => (
                    <li
                        key={`${it.name}-${i}`}
                        className="flex items-center justify-between py-2"
                    >
                        <span className="text-sm text-gray-700 flex items-center gap-2">
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${accent}`}
                            />
                            {it.name}
                        </span>
                        <span className="text-sm font-medium text-gray-500">
                            {it.amount}
                            {it.unit}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function DishDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const dish = getDish(id);

    if (!dish) {
        return (
            <div className="max-w-md mx-auto px-4 pt-10 text-center">
                <p className="text-5xl">🤔</p>
                <p className="text-gray-500 mt-3">
                    没找到这道菜，可能是刷新丢失了。
                </p>
                <button
                    onClick={() => navigate("/")}
                    className="mt-5 px-5 py-2.5 rounded-xl bg-brand text-white font-medium"
                >
                    回首页重新生成
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto min-h-full pb-12">
            {/* 顶部返回 */}
            <div className="sticky top-0 z-10 bg-[#faf6f1]/95 backdrop-blur px-4 py-3">
                <button
                    onClick={() => navigate(-1)}
                    className="text-sm text-gray-600 flex items-center gap-1"
                >
                    ‹ 返回
                </button>
            </div>

            <div className="px-4 space-y-4">
                {/* 头图区 */}
                <header className="bg-gradient-to-br from-brand-400 to-brand-600 rounded-3xl p-6 text-white shadow-lg">
                    <div className="text-5xl">{dish.emoji}</div>
                    <h1 className="text-2xl font-bold mt-2">{dish.name}</h1>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full">
                            {dish.category}
                        </span>
                        <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full">
                            ⏱ {dish.time} 分钟
                        </span>
                        {dish.tags.map((t) => (
                            <span
                                key={t}
                                className="text-xs bg-white/20 px-2.5 py-1 rounded-full"
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                    {dish.reasons.length > 0 && (
                        <p className="text-sm text-white/90 mt-3">
                            💡 {dish.reasons.join(" · ")}
                        </p>
                    )}
                </header>

                {/* 备料：食材 + 调味料 分开清晰列出 */}
                <AmountTable
                    title="🥕 食材备料"
                    items={dish.ingredients}
                    accent="bg-brand"
                />
                <AmountTable
                    title="🧂 调味料"
                    items={dish.seasoning}
                    accent="bg-amber-400"
                />

                {/* 分步骤做法 */}
                {dish.steps.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-semibold text-gray-800 mb-3">
                            👩‍🍳 做法步骤
                        </h3>
                        <ol className="space-y-3">
                            {dish.steps.map((s, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="shrink-0 w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center font-medium">
                                        {i + 1}
                                    </span>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {s}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {/* 小贴士 */}
                {dish.tips && (
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                        <p className="text-sm text-amber-700">
                            💡 小贴士：{dish.tips}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
