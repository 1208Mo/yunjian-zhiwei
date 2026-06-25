import { useNavigate } from "react-router-dom";

// 菜品卡片。item 已归一为统一结构（见 utils/menu.js）。
// 点击整卡跳转到菜品详情页。
export default function DishCard({ item, delay = 0 }) {
    const navigate = useNavigate();
    const reasons = item.reasons || [];

    return (
        <button
            onClick={() => navigate(`/dish/${item.id}`)}
            className="group w-full text-left bg-white rounded-2xl p-4 border border-ink-100 animate-fadeup active:scale-[.99] transition-all duration-200"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-start gap-3">
                <div className="text-3xl">{item.emoji}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-ink-800">
                            {item.name}
                        </h3>
                        <span className="text-xs text-ink-400 shrink-0">
                            {item.time} 分钟
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                            {item.category}
                        </span>
                        {item.tags.map((t) => (
                            <span
                                key={t}
                                className="text-[11px] px-2 py-0.5 rounded-full bg-ink-50 text-ink-500"
                            >
                                {t}
                            </span>
                        ))}
                    </div>

                    {reasons.length > 0 && (
                        <p className="text-xs text-ink-500 mt-2">
                            {reasons.slice(0, 2).join(" · ")}
                        </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-ink-400">
                            {item.ingredients.length} 种食材 ·{" "}
                            {item.steps.length} 步
                        </span>
                        <span className="text-xs text-brand font-medium">
                            查看备料与做法 ›
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}
