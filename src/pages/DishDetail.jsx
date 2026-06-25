import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDish, ensureDishDetail } from "../utils/dishRegistry.js";
import { dishToText, normalizeDish } from "../utils/menu.js";
import { fetchDishDetail } from "../api/client.js";
import { useFavorites } from "../store/favorites.jsx";

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
    const { isFavorite, toggleFavorite } = useFavorites();
    const [copied, setCopied] = useState(false);
    // 本地版本号，详情补全后触发重渲染（dish 存在 registry 里，非 state）
    const [, forceRender] = useState(0);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");
    const dish = getDish(id);

    // 阶段二：若这道菜还没有做法详情（来自菜名清单），按菜名补全。
    // 用 ensureDishDetail 做请求去重 + 缓存命中，避免重复调用 /api/dish。
    const needDetail = dish && (!dish.steps || dish.steps.length === 0);
    useEffect(() => {
        if (!dish || !needDetail) {
            return undefined;
        }
        let alive = true;
        setDetailLoading(true);
        setDetailError("");
        ensureDishDetail(dish.id, async () => {
            const { dish: detail } = await fetchDishDetail({
                name: dish.name,
                serves: dish.serves || 1,
                cuisines: dish.cuisines || [],
                cookware: dish.cookware || [],
                dislikes: dish.dislikes || [],
            });
            // 归一并保留原 id/reasons
            return {
                ...normalizeDish({ ...detail, id: dish.id }),
                reasons: dish.reasons,
            };
        })
            .then(() => {
                if (alive) {
                    forceRender((n) => n + 1);
                }
            })
            .catch((e) => {
                if (alive) {
                    setDetailError(e.message || "做法加载失败");
                }
            })
            .finally(() => {
                if (alive) {
                    setDetailLoading(false);
                }
            });
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

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
            <div className="sticky top-0 z-10 bg-[#faf6f1]/95 backdrop-blur px-4 py-3 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="text-sm text-gray-600 flex items-center gap-1"
                >
                    ‹ 返回
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(
                                    dishToText(dish),
                                );
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1500);
                            } catch {
                                // 忽略
                            }
                        }}
                        className="text-sm px-3 py-1.5 rounded-full bg-white text-gray-500 shadow-sm"
                    >
                        {copied ? "已复制" : "复制做法"}
                    </button>
                    <button
                        onClick={() => toggleFavorite(dish)}
                        className={
                            "flex items-center gap-1 text-sm px-3 py-1.5 rounded-full transition " +
                            (isFavorite(dish.id)
                                ? "bg-amber-100 text-amber-600"
                                : "bg-white text-gray-500 shadow-sm")
                        }
                    >
                        <span>{isFavorite(dish.id) ? "★" : "☆"}</span>
                        {isFavorite(dish.id) ? "已收藏" : "收藏"}
                    </button>
                </div>
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

                {/* 做法详情加载中（阶段二补全） */}
                {detailLoading && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse space-y-3">
                        <div className="h-4 w-28 bg-ink-100 rounded" />
                        <div className="h-3 w-full bg-ink-100 rounded" />
                        <div className="h-3 w-5/6 bg-ink-100 rounded" />
                        <div className="h-3 w-2/3 bg-ink-100 rounded" />
                        <p className="text-xs text-brand pt-1">
                            正在生成详细做法…🍳
                        </p>
                    </div>
                )}
                {detailError && (
                    <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-700">
                        {detailError}
                    </div>
                )}

                {/* 备菜与刀工 */}
                {dish.prep.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-semibold text-gray-800 mb-3">
                            🔪 备菜与刀工
                        </h3>
                        <ul className="space-y-2">
                            {dish.prep.map((p, i) => (
                                <li
                                    key={i}
                                    className="flex gap-2 text-sm text-gray-600 leading-relaxed"
                                >
                                    <span className="text-brand shrink-0">
                                        •
                                    </span>
                                    <span>{p}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

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
                <AmountTable
                    title="🥣 酱料 / 碗汁调配"
                    items={dish.sauce}
                    accent="bg-rose-400"
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
