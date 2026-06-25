import { useNavigate } from "react-router-dom";
import { useFavorites } from "../store/favorites.jsx";
import DishCard from "../components/DishCard.jsx";

// 收藏夹页：查看 / 管理已保存的菜谱。数据来自 localStorage 持久化。
export default function Favorites() {
    const navigate = useNavigate();
    const { favorites } = useFavorites();

    return (
        <div className="space-y-5">
            <header className="pt-1 pb-1">
                <h1 className="text-2xl font-bold text-ink-800 tracking-tight">
                    我的收藏
                </h1>
                <p className="text-sm text-ink-400 mt-1">
                    {favorites.length > 0
                        ? `已收藏 ${favorites.length} 道菜，随时翻出来照着做`
                        : "把喜欢的菜谱收藏起来，方便随时查看"}
                </p>
            </header>

            {favorites.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-5xl">🍽️</p>
                    <p className="text-gray-500 mt-3 text-sm">
                        还没有收藏的菜谱
                    </p>
                    <p className="text-gray-400 mt-1 text-xs">
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
                        <DishCard key={d.id} item={d} delay={i * 60} />
                    ))}
                </div>
            )}
        </div>
    );
}
