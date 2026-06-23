import { useEffect, useState } from "react";
import { RECIPES } from "../data/recipes.js";
import { genMultipleMenus } from "../engine/recommend.js";
import { fetchAiMenu } from "../api/client.js";
import { normalizeMenu } from "../utils/menu.js";
import { useSharedMenu } from "../store/sharedMenu.jsx";
import Chip from "../components/Chip.jsx";
import MenuResult from "../components/MenuResult.jsx";

const TASTE_OPTIONS = ["家常", "川味", "酸甜", "麻辣", "清淡", "清爽", "浓郁", "鲜"];
const HEALTH_OPTIONS = ["低脂", "低卡", "高蛋白", "素食", "高纤维", "暖胃"];

function splitInput(value) {
    return value.split(/[,，、\s]+/).filter(Boolean);
}

export default function TodayMenu() {
    const { sharedMenu } = useSharedMenu();
    const [ingredients, setIngredients] = useState("");
    const [clearout, setClearout] = useState("");
    const [serves, setServes] = useState(2);
    const [maxTime, setMaxTime] = useState(30);
    const [tastes, setTastes] = useState([]);
    const [healthGoals, setHealthGoals] = useState([]);

    const [menus, setMenus] = useState(null);
    const [activeMenu, setActiveMenu] = useState(0);
    const [loading, setLoading] = useState(false);
    const [source, setSource] = useState(null); // 'ai' | 'local'

    const toggle = (list, setList, value) => {
        setList(
            list.includes(value)
                ? list.filter((x) => x !== value)
                : [...list, value],
        );
    };

    const scrollToResult = () => {
        setTimeout(() => {
            document
                .getElementById("result")
                ?.scrollIntoView({ behavior: "smooth" });
        }, 80);
    };

    const buildLocalMenus = (ctx) =>
        genMultipleMenus(RECIPES, ctx, serves, 3).map((m) =>
            normalizeMenu(m),
        );

    const handleGenerate = async () => {
        const payload = {
            ingredients: splitInput(ingredients),
            clearout: splitInput(clearout),
            serves,
            maxTime,
            tastes,
            healthGoals,
        };

        setLoading(true);
        setMenus(null);

        try {
            // 优先调用大模型
            const { menu } = await fetchAiMenu(payload);
            setMenus([normalizeMenu(menu)]);
            setSource("ai");
        } catch {
            // 后端/模型不可用时回落到本地规则引擎
            const ctx = {
                ingredients: payload.ingredients,
                clearout: payload.clearout,
                maxTime,
                tastes,
                healthGoals,
            };
            setMenus(buildLocalMenus(ctx));
            setSource("local");
        } finally {
            setActiveMenu(0);
            setLoading(false);
            scrollToResult();
        }
    };

    // 来自「饭局共识」的最终菜单，自动展示
    useEffect(() => {
        if (sharedMenu) {
            setMenus([normalizeMenu(sharedMenu)]);
            setSource(null);
            setActiveMenu(0);
            scrollToResult();
        }
    }, [sharedMenu]);

    return (
        <div className="space-y-5">
            <header className="bg-gradient-to-br from-brand-400 to-brand-600 rounded-3xl p-5 text-white shadow-lg">
                <h1 className="text-xl font-bold">今天吃什么？🍽️</h1>
                <p className="text-sm text-white/85 mt-1">
                    告诉我你有啥、想吃啥，AI 帮你定好菜单
                </p>
            </header>

            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-700">
                        🥕 现有食材{" "}
                        <span className="text-gray-400 font-normal">
                            （逗号分隔，可不填）
                        </span>
                    </label>
                    <input
                        value={ingredients}
                        onChange={(e) => setIngredients(e.target.value)}
                        placeholder="番茄、鸡蛋、土豆…"
                        className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700">
                        🧊 冰箱清仓{" "}
                        <span className="text-gray-400 font-normal">
                            （快过期，优先用）
                        </span>
                    </label>
                    <input
                        value={clearout}
                        onChange={(e) => setClearout(e.target.value)}
                        placeholder="比如：青菜、剩米饭"
                        className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            👥 用餐人数
                        </label>
                        <div className="flex items-center gap-3 mt-1.5">
                            <button
                                onClick={() =>
                                    setServes(Math.max(1, serves - 1))
                                }
                                className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 text-lg active:bg-gray-200"
                            >
                                −
                            </button>
                            <span className="text-lg font-semibold w-6 text-center">
                                {serves}
                            </span>
                            <button
                                onClick={() => setServes(serves + 1)}
                                className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 text-lg active:bg-gray-200"
                            >
                                +
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            ⏱ 最多耗时 {maxTime}分钟
                        </label>
                        <input
                            type="range"
                            min="10"
                            max="90"
                            step="5"
                            value={maxTime}
                            onChange={(e) => setMaxTime(+e.target.value)}
                            className="mt-3 w-full accent-brand"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700">
                        😋 口味偏好
                    </label>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {TASTE_OPTIONS.map((t) => (
                            <Chip
                                key={t}
                                active={tastes.includes(t)}
                                onClick={() => toggle(tastes, setTastes, t)}
                            >
                                {t}
                            </Chip>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700">
                        🎯 健康目标
                    </label>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {HEALTH_OPTIONS.map((t) => (
                            <Chip
                                key={t}
                                active={healthGoals.includes(t)}
                                onClick={() =>
                                    toggle(healthGoals, setHealthGoals, t)
                                }
                            >
                                {t}
                            </Chip>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-brand text-white font-semibold shadow-md active:scale-[.98] transition disabled:opacity-60"
                >
                    {loading ? "AI 正在配菜…🍳" : "✨ 生成今日菜单"}
                </button>
            </div>

            {menus && (
                <div id="result" className="space-y-4">
                    {source === "local" && (
                        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                            ⚠️ AI 服务暂不可用，已用本地推荐引擎为你兜底。
                        </p>
                    )}
                    {source === "ai" && (
                        <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                            ✨ 由文心大模型（ERNIE）实时生成
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
                </div>
            )}
        </div>
    );
}
