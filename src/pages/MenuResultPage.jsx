import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMenuResult } from "../store/menuResult.jsx";
import MenuResult from "../components/MenuResult.jsx";
import MenuSkeleton from "../components/MenuSkeleton.jsx";

// 今日菜单生成结果页：由 TodayMenu 点击「生成」后跳转而来。
// 生成中显示骨架屏；完成后展示完整菜单（结果持久化，刷新不丢）；
// 失败显示错误态，可重试或返回首页。
export default function MenuResultPage() {
    const navigate = useNavigate();
    const { result, retry, canRetry } = useMenuResult();
    const { loading, menus, serves, source, error } = result;
    const [activeMenu, setActiveMenu] = useState(0);

    // 只有「既没在加载、又没有任何结果、也没有错误」才回首页
    // （持久化后刷新会带回 menus，不会再误跳）
    useEffect(() => {
        if (!loading && !menus && !error) {
            navigate("/", { replace: true });
        }
    }, [loading, menus, error, navigate]);

    return (
        <div className="space-y-4">
            <header className="flex items-center gap-2">
                <button
                    onClick={() => navigate("/")}
                    className="w-9 h-9 rounded-full bg-white shadow-sm text-gray-600 flex items-center justify-center active:bg-gray-100"
                    aria-label="返回"
                >
                    ‹
                </button>
                <div>
                    <h1 className="text-lg font-bold text-gray-800">
                        {loading ? "AI 正在配菜…🍳" : "今日菜单"}
                    </h1>
                    <p className="text-xs text-gray-400">
                        {loading
                            ? "稍等片刻，马上为你搭配好"
                            : "已为你搭配好，点菜品看详细做法"}
                    </p>
                </div>
            </header>

            {loading && <MenuSkeleton count={4} />}

            {/* 彻底失败（连本地兜底都没有）：只有错误，可重试 */}
            {!loading && !menus && error && (
                <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-4">
                    <p className="text-4xl">😵‍💫</p>
                    <p className="text-sm text-gray-600">{error}</p>
                    <div className="flex gap-2">
                        {canRetry && (
                            <button
                                onClick={retry}
                                className="flex-1 py-2.5 rounded-xl bg-brand text-white font-medium active:scale-[.98]"
                            >
                                ↻ 重试
                            </button>
                        )}
                        <button
                            onClick={() => navigate("/")}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-medium"
                        >
                            返回首页
                        </button>
                    </div>
                </div>
            )}

            {!loading && menus && (
                <div className="space-y-4">
                    {/* AI 失败已用本地兜底：黄条提示 + 可重试拉 AI 版 */}
                    {error && (
                        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                            <span className="flex-1">⚠️ {error}</span>
                            {canRetry && (
                                <button
                                    onClick={retry}
                                    className="shrink-0 px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 font-medium active:bg-amber-200"
                                >
                                    重试 AI
                                </button>
                            )}
                        </div>
                    )}
                    {!error && source === "local" && (
                        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                            ⚠️ AI 服务暂不可用，已用本地推荐引擎为你兜底。
                        </p>
                    )}

                    {menus.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {menus.map((m, i) => (
                                <button
                                    key={m.label + i}
                                    onClick={() => setActiveMenu(i)}
                                    className={
                                        "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition " +
                                        (activeMenu === i
                                            ? "bg-brand text-white shadow"
                                            : "bg-white text-gray-500 border border-gray-200")
                                    }
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <MenuResult menu={menus[activeMenu]} serves={serves} />

                    <button
                        onClick={() => navigate("/")}
                        className="w-full py-3 rounded-xl border border-brand/40 text-brand font-medium active:bg-orange-50"
                    >
                        ↺ 换一换 / 重新生成
                    </button>
                </div>
            )}
        </div>
    );
}
