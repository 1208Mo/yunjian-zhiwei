import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "../store/favorites.jsx";
import { dishToText } from "../utils/menu.js";
import DishCard from "../components/DishCard.jsx";

// 收藏夹页：查看 / 管理已保存的菜谱。数据来自 localStorage 持久化。
export default function Favorites() {
    const navigate = useNavigate();
    const { favorites } = useFavorites();
    const [copiedId, setCopiedId] = useState(null);

    const copyDish = async (dish) => {
        try {
            await navigator.clipboard.writeText(dishToText(dish));
            setCopiedId(dish.id);
            setTimeout(() => setCopiedId(null), 1500);
        } catch {
            // 复制失败静默
        }
    };

    const copyAll = async () => {
        try {
            const text = favorites
                .map((d) => dishToText(d))
                .join("\n\n— — — — —\n\n");
            await navigator.clipboard.writeText(text);
            setCopiedId("all");
            setTimeout(() => setCopiedId(null), 1500);
        } catch {
            // 忽略
        }
    };

    return (
        <div className="space-y-5">
            <header className="pt-1 pb-1 flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-ink-800 tracking-tight">
                        我的收藏
                    </h1>
                    <p className="text-sm text-ink-400 mt-1">
                        {favorites.length > 0
                            ? `已收藏 ${favorites.length} 道菜，随时翻出来照着做`
                            : "把喜欢的菜谱收藏起来，方便随时查看"}
                    </p>
                </div>
                {favorites.length > 0 && (
                    <button
                        onClick={copyAll}
                        className="shrink-0 text-sm text-brand font-medium px-3 py-1.5 rounded-lg bg-brand-50 active:bg-brand-100"
                    >
                        {copiedId === "all" ? "已复制" : "复制全部"}
                    </button>
                )}
            </header>

            {favorites.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-5xl">🍽️</p>
                    <p className="text-ink-500 mt-3 text-sm">还没有收藏的菜谱</p>
                    <p className="text-ink-400 mt-1 text-xs">
                        在菜品详情页点 ☆ 即可收藏
                    </p>
                    <button
                        onClick={() => navigate("/")}
                        className="mt-5 px-5 py-2.5 rounded-xl bg-brand text-white font-medium"
                    >
                        去生成菜单
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {favorites.map((d, i) => (
                        <div key={d.id} className="relative">
                            <DishCard item={d} delay={i * 60} />
                            <button
                                onClick={() => copyDish(d)}
                                className="absolute top-3 right-3 text-xs px-2.5 py-1 rounded-lg bg-white border border-ink-200 text-ink-500 active:bg-ink-50"
                            >
                                {copiedId === d.id ? "已复制" : "复制做法"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
