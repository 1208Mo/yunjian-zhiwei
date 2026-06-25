import { useEffect, useRef, useState } from "react";
import { RECIPES } from "../data/recipes.js";
import { genMultipleMenus, COOKWARE_OPTIONS } from "../engine/recommend.js";
import { fetchVisionIngredients, streamAiMenu } from "../api/client.js";
import { normalizeMenu } from "../utils/menu.js";
import { fileToCompressedDataUrl } from "../utils/image.js";
import { useSharedMenu } from "../store/sharedMenu.jsx";
import { useMenuResult } from "../store/menuResult.jsx";
import Chip from "../components/Chip.jsx";
import IngredientPicker from "../components/IngredientPicker.jsx";
import ProgressLoader from "../components/ProgressLoader.jsx";
import MenuResult from "../components/MenuResult.jsx";

const TASTE_OPTIONS = ["家常", "川味", "酸甜", "麻辣", "清淡", "清爽", "浓郁", "鲜"];
const HEALTH_OPTIONS = ["低脂", "低卡", "高蛋白", "素食", "高纤维", "暖胃"];
// 菜系（单选，不限=不挑菜系）
const CUISINE_OPTIONS = [
    "粤菜", "川菜", "湘菜", "鲁菜", "苏菜", "浙菜", "闽菜", "徽菜", "东北菜", "西北菜", "家常",
];

// 常见食材，按类别分组，点选即可，不必手动输入
const INGREDIENT_GROUPS = [
    {
        label: "肉蛋",
        items: ["猪肉", "鸡肉", "牛肉", "鸡蛋", "排骨", "虾", "鱼", "培根"],
    },
    {
        label: "蔬菜",
        items: ["番茄", "土豆", "青椒", "黄瓜", "茄子", "白菜", "西兰花", "胡萝卜", "生菜", "菠菜", "豆角", "蘑菇"],
    },
    {
        label: "豆制品/主食",
        items: ["豆腐", "米饭", "面条", "玉米", "年糕"],
    },
    {
        label: "常备",
        items: ["葱", "姜", "蒜", "洋葱"],
    },
];

// 常见忌口，点选即可
const DISLIKE_GROUPS = [
    {
        label: "常见忌口",
        items: ["鱼", "虾", "蟹", "香菜", "葱", "蒜", "内脏", "羊肉", "辣椒", "茄子", "苦瓜", "胡萝卜", "芹菜", "肥肉"],
    },
];

function splitInput(value) {
    return value.split(/[,，、\s]+/).filter(Boolean);
}

export default function TodayMenu() {
    const { sharedMenu } = useSharedMenu();
    const { setResult, runGenerate, retry, regenerate, canRetry, result } =
        useMenuResult();
    const { loading, menus, serves: resultServes, error } = result;
    const [ingredients, setIngredients] = useState("");
    const [clearout, setClearout] = useState("");
    const [serves, setServes] = useState(1);
    const [maxTime, setMaxTime] = useState(30);
    const [tastes, setTastes] = useState([]);
    const [cuisine, setCuisine] = useState(""); // 菜系，单选，空=不限
    const [healthGoals, setHealthGoals] = useState([]);
    const [cookware, setCookware] = useState([]);
    const [dislikes, setDislikes] = useState(""); // 忌口，「、」分隔

    const [showMore, setShowMore] = useState(false); // 展开更多偏好
    const [activeMenu, setActiveMenu] = useState(0); // 多套菜单切换
    // 有结果/生成中 → 展示结果区；点「返回重填」回到表单
    const [showForm, setShowForm] = useState(!result.menus && !result.loading);

    // 拍照识别食材
    const fileInputRef = useRef(null);
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState("");

    const toggle = (list, setList, value) => {
        setList(
            list.includes(value)
                ? list.filter((x) => x !== value)
                : [...list, value],
        );
    };

    // 把识别到的食材并入现有食材（去重）
    const mergeIngredients = (names) => {
        const exist = splitInput(ingredients);
        const merged = [...exist];
        names.forEach((n) => {
            if (n && !merged.includes(n)) {
                merged.push(n);
            }
        });
        setIngredients(merged.join("、"));
    };

    // 折叠面板里已设置的偏好摘要，显示在「更多偏好」标题旁
    const prefSummary = [
        `${serves}人`,
        `≤${maxTime}分钟`,
        cuisine,
        ...tastes,
        ...healthGoals,
        ...cookware,
    ]
        .filter(Boolean)
        .join(" / ");

    const handlePickImage = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // 允许重复选同一张
        if (!file) {
            return;
        }
        setScanError("");
        setScanning(true);
        try {
            const dataUrl = await fileToCompressedDataUrl(file);
            const { result } = await fetchVisionIngredients(dataUrl);
            const names = (result?.ingredients || [])
                .filter((i) => (i.confidence ?? 1) >= 0.4)
                .map((i) => i.name);
            if (names.length === 0) {
                setScanError("没识别到食材，换张更清晰的照片试试～");
            } else {
                mergeIngredients(names);
            }
        } catch {
            setScanError("识别服务暂不可用，请手动输入食材。");
        } finally {
            setScanning(false);
        }
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
            cuisine,
            healthGoals,
            cookware,
            dislikes: splitInput(dislikes),
        };
        const ctx = {
            ingredients: payload.ingredients,
            clearout: payload.clearout,
            maxTime,
            tastes,
            cuisine,
            healthGoals,
            cookware,
            dislikes: payload.dislikes,
        };

        // 切到结果视图（同一 tab 内），生成在全局 Provider 里执行——
        // 切 Tab 不中断，回来仍停在结果视图，不会丢。
        setActiveMenu(0);
        setShowForm(false);
        runGenerate({
            serves,
            payload,
            normalizeMenu,
            aiFn: (p) => streamAiMenu(p),
            buildLocal: () => buildLocalMenus(ctx),
        });
    };

    // 来自「饭局共识」的最终菜单，在本页结果视图展示
    useEffect(() => {
        if (sharedMenu) {
            setResult({
                loading: false,
                menus: [normalizeMenu(sharedMenu)],
                serves,
                source: null,
                error: "",
            });
            setActiveMenu(0);
            setShowForm(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sharedMenu]);

    // 结果视图：生成中显示进度条，完成后显示菜单 + 换一桌/重填
    if (!showForm && (loading || menus || error)) {
        return (
            <div className="space-y-4">
                <header className="flex items-center gap-2">
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-9 h-9 rounded-full bg-white border border-ink-100 text-ink-500 flex items-center justify-center active:bg-ink-50"
                        aria-label="返回重填"
                    >
                        ‹
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-ink-800">
                            {loading ? "正在配菜…" : "今日菜单"}
                        </h1>
                        <p className="text-xs text-ink-400">
                            {loading
                                ? "稍等片刻，马上为你搭配好"
                                : "已为你搭配好，点菜品看详细做法"}
                        </p>
                    </div>
                </header>

                {loading && (
                    <ProgressLoader
                        accent="brand"
                        estimateMs={40000}
                        startedAt={result.startedAt}
                    />
                )}

                {/* 彻底失败（连本地兜底都没有） */}
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
                                onClick={() => setShowForm(true)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-medium"
                            >
                                返回重填
                            </button>
                        </div>
                    </div>
                )}

                {!loading && menus && (
                    <div className="space-y-4">
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

                        <MenuResult
                            menu={menus[activeMenu]}
                            serves={resultServes}
                        />

                        <div className="flex gap-2">
                            {canRetry && (
                                <button
                                    onClick={() => {
                                        setActiveMenu(0);
                                        regenerate();
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-brand text-white font-medium shadow-md active:scale-[.98]"
                                >
                                    ↺ 换一桌（同条件）
                                </button>
                            )}
                            <button
                                onClick={() => setShowForm(true)}
                                className="flex-1 py-3 rounded-xl border border-brand/40 text-brand font-medium active:bg-orange-50"
                            >
                                改条件重做
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <header className="pt-1 pb-1">
                <h1 className="text-2xl font-bold text-ink-800 tracking-tight">
                    今天吃什么
                </h1>
                <p className="text-sm text-ink-400 mt-1">
                    告诉我你有什么、想吃什么，帮你把菜单定下来
                </p>
            </header>

            <div className="bg-white rounded-2xl p-4 border border-ink-100 space-y-4">
                <div>
                    <label className="text-sm font-medium text-ink-700">
                        🥕 现有食材{" "}
                        <span className="text-ink-400 font-normal">
                            （点选或输入，可不填）
                        </span>
                    </label>

                    <div className="mt-1.5">
                        <IngredientPicker
                            value={ingredients}
                            onChange={setIngredients}
                            groups={INGREDIENT_GROUPS}
                            placeholder="点下方标签，或输入后回车"
                            accent="brand"
                        />
                    </div>

                    {/* 拍照识别食材 */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePickImage}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={scanning}
                        className="mt-2 w-full py-2 rounded-xl border border-dashed border-brand/50 text-brand text-sm font-medium flex items-center justify-center gap-1.5 active:bg-orange-50 disabled:opacity-60"
                    >
                        {scanning ? "🔍 正在识别食材…" : "📷 拍照识别冰箱食材"}
                    </button>
                    {scanError && (
                        <p className="text-xs text-amber-600 mt-1.5">
                            {scanError}
                        </p>
                    )}
                </div>

                <div>
                    <label className="text-sm font-medium text-ink-700">
                        🧊 冰箱清仓{" "}
                        <span className="text-ink-400 font-normal">
                            （快过期，优先用）
                        </span>
                    </label>
                    <div className="mt-1.5">
                        <IngredientPicker
                            value={clearout}
                            onChange={setClearout}
                            placeholder="输入快过期的食材，回车添加，如 青菜、剩米饭"
                            placeholderActive="继续添加…"
                            accent="brand"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-ink-700">
                        🚫 忌口{" "}
                        <span className="text-ink-400 font-normal">
                            （不吃的，绝不出现）
                        </span>
                    </label>
                    <div className="mt-1.5">
                        <IngredientPicker
                            value={dislikes}
                            onChange={setDislikes}
                            groups={DISLIKE_GROUPS}
                            placeholder="点下方或输入，如 鱼、香菜、内脏"
                            placeholderActive="继续添加…"
                            accent="brand"
                        />
                    </div>
                </div>

                {/* 更多偏好：默认折叠，减少滚动 */}
                <button
                    type="button"
                    onClick={() => setShowMore((v) => !v)}
                    className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-600"
                >
                    <span>
                        ⚙️ 更多偏好
                        {prefSummary && (
                            <span className="text-gray-400 font-normal ml-1.5">
                                · {prefSummary}
                            </span>
                        )}
                    </span>
                    <span
                        className={
                            "text-gray-400 transition-transform " +
                            (showMore ? "rotate-180" : "")
                        }
                    >
                        ▾
                    </span>
                </button>

                {showMore && (
                  <div className="space-y-4 pt-1">
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
                            🍲 菜系{" "}
                            <span className="text-ink-400 font-normal">
                                （单选，不选=不限）
                            </span>
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {CUISINE_OPTIONS.map((c) => (
                                <Chip
                                    key={c}
                                    active={cuisine === c}
                                    onClick={() =>
                                        setCuisine(cuisine === c ? "" : c)
                                    }
                                >
                                    {c}
                                </Chip>
                            ))}
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

                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            🍳 现有厨具{" "}
                            <span className="text-gray-400 font-normal">
                                （不选=不限，选了只推能做的菜）
                            </span>
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {COOKWARE_OPTIONS.map((t) => (
                                <Chip
                                    key={t}
                                    active={cookware.includes(t)}
                                    onClick={() =>
                                        toggle(cookware, setCookware, t)
                                    }
                                >
                                    {t}
                                </Chip>
                            ))}
                        </div>
                    </div>
                  </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-brand text-white font-semibold active:scale-[.98] transition disabled:opacity-60"
                >
                    {loading ? "正在配菜…" : "生成今日菜单"}
                </button>
            </div>
        </div>
    );
}
