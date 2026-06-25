import { useEffect, useState } from "react";
import { RECIPES } from "../data/recipes.js";
import { CONSTELLATIONS, ELEMENTS, LUCKY_COLORS } from "../data/fun.js";
import { buildMenu } from "../engine/recommend.js";
import { streamAiFun } from "../api/client.js";
import { normalizeDish } from "../utils/menu.js";
import { registerDishes } from "../utils/dishRegistry.js";
import { useFunResult } from "../store/funResult.jsx";
import Chip from "../components/Chip.jsx";
import ProgressLoader from "../components/ProgressLoader.jsx";
import DishCard from "../components/DishCard.jsx";

const MODES = [
    { key: "blindbox", label: "🎁 盲盒" },
    { key: "constellation", label: "✨ 星座" },
    { key: "element", label: "🔮 五行" },
];

const BASE_CTX = {
    ingredients: [],
    clearout: [],
    maxTime: 60,
    tastes: [],
    healthGoals: [],
};

export default function FunPick() {
    const [mode, setMode] = useState("blindbox");
    const [constellation, setConstellation] = useState("白羊座");
    const [element, setElement] = useState("火");
    // 生成态与结果来自全局 Provider，切 Tab 不中断
    const { loading, result, startedAt, runFun } = useFunResult();

    // 登记结果菜品，供详情页取用
    useEffect(() => {
        if (result?.dishes) {
            registerDishes(result.dishes);
        }
    }, [result]);

    const buildLocalResult = () => {
        if (mode === "blindbox") {
            const color =
                LUCKY_COLORS[
                    Math.floor(Math.random() * LUCKY_COLORS.length)
                ];
            return {
                title: "🎁 菜单盲盒",
                line: `今日幸运色【${color}】，盲盒为你开出这套`,
                dishes: buildMenu(RECIPES, BASE_CTX, 2).map(normalizeDish),
            };
        }
        if (mode === "constellation") {
            const c = CONSTELLATIONS[constellation];
            return {
                title: `✨ ${constellation}今日荐餐`,
                line: c.line,
                dishes: buildMenu(
                    RECIPES,
                    { ...BASE_CTX, elementPref: c.elementPref },
                    2,
                ).map(normalizeDish),
            };
        }
        const e = ELEMENTS[element];
        return {
            title: `🔮 五行·${element}`,
            line: `${e.taste}当道 — ${e.desc}`,
            dishes: buildMenu(
                RECIPES,
                { ...BASE_CTX, elementPref: element },
                2,
            ).map(normalizeDish),
        };
    };

    const run = () => {
        const payload = {
            mode,
            constellation,
            element,
            luckyColor:
                LUCKY_COLORS[
                    Math.floor(Math.random() * LUCKY_COLORS.length)
                ],
        };

        // 生成放到全局 store 执行，切换 Tab 不会中断这次生成
        runFun({
            aiFn: () => streamAiFun(payload),
            normalize: (aiResult) => ({
                title: aiResult.title,
                line: aiResult.line,
                dishes: (aiResult.dishes || []).map(normalizeDish),
            }),
            buildLocal: buildLocalResult,
        });
    };

    const buttonLabel = loading
        ? "AI 占卜中…🔮"
        : mode === "blindbox"
          ? "🎁 开盲盒"
          : mode === "constellation"
            ? "✨ 看今日荐餐"
            : "🔮 测五行口味";

    return (
        <div className="space-y-5">
            <header className="pt-1 pb-1">
                <h1 className="text-2xl font-bold text-ink-800 tracking-tight">
                    今天靠点小运气
                </h1>
                <p className="text-sm text-ink-400 mt-1">
                    心情、星座、五行，让开饭多点记忆点
                </p>
            </header>

            <div className="flex gap-2">
                {MODES.map((m) => (
                    <button
                        key={m.key}
                        onClick={() => setMode(m.key)}
                        className={
                            "flex-1 py-2.5 rounded-xl text-sm font-medium transition " +
                            (mode === m.key
                                ? "bg-brand text-white"
                                : "bg-white text-ink-500 border border-ink-200")
                        }
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl p-4 border border-ink-100">
                {mode === "constellation" && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {Object.keys(CONSTELLATIONS).map((c) => (
                            <Chip
                                key={c}
                                active={constellation === c}
                                onClick={() => setConstellation(c)}
                            >
                                {c}
                            </Chip>
                        ))}
                    </div>
                )}

                {mode === "element" && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {Object.keys(ELEMENTS).map((e) => (
                            <Chip
                                key={e}
                                active={element === e}
                                onClick={() => setElement(e)}
                            >
                                {e}（{ELEMENTS[e].taste}）
                            </Chip>
                        ))}
                    </div>
                )}

                <button
                    onClick={run}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-brand text-white font-semibold active:scale-[.98] transition disabled:opacity-60"
                >
                    {buttonLabel}
                </button>
            </div>

            {/* 生成中：进度条占位 */}
            {loading && (
                <div id="fun-result">
                    <ProgressLoader
                        accent="brand"
                        estimateMs={25000}
                        startedAt={startedAt}
                    />
                </div>
            )}

            {!loading && result && (
                <div id="fun-result" className="space-y-3 animate-pop">
                    <div className="bg-white rounded-2xl p-4 border border-ink-100">
                        <h2 className="font-bold text-ink-800">
                            {result.title}
                        </h2>
                        <p className="text-sm text-brand mt-1">
                            {result.line}
                        </p>
                    </div>
                    {result.dishes.map((d, i) => (
                        <DishCard key={d.id} item={d} delay={i * 60} />
                    ))}
                </div>
            )}
        </div>
    );
}
