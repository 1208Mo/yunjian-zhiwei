import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RECIPES } from "../data/recipes.js";
import { genMultipleMenus, COOKWARE_OPTIONS } from "../engine/recommend.js";
import { fetchVisionIngredients, streamAiMenu } from "../api/client.js";
import { normalizeMenu } from "../utils/menu.js";
import { fileToCompressedDataUrl } from "../utils/image.js";
import { useSharedMenu } from "../store/sharedMenu.jsx";
import { useMenuResult } from "../store/menuResult.jsx";
import Chip from "../components/Chip.jsx";

const TASTE_OPTIONS = ["家常", "川味", "酸甜", "麻辣", "清淡", "清爽", "浓郁", "鲜"];
const HEALTH_OPTIONS = ["低脂", "低卡", "高蛋白", "素食", "高纤维", "暖胃"];

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

function splitInput(value) {
    return value.split(/[,，、\s]+/).filter(Boolean);
}

export default function TodayMenu() {
    const { sharedMenu } = useSharedMenu();
    const { setResult, runGenerate } = useMenuResult();
    const navigate = useNavigate();
    const [ingredients, setIngredients] = useState("");
    const [ingredientInput, setIngredientInput] = useState("");
    const [clearout, setClearout] = useState("");
    const [serves, setServes] = useState(1);
    const [maxTime, setMaxTime] = useState(30);
    const [tastes, setTastes] = useState([]);
    const [healthGoals, setHealthGoals] = useState([]);
    const [cookware, setCookware] = useState([]);

    const [loading, setLoading] = useState(false);
    const [showMore, setShowMore] = useState(false); // 展开更多偏好

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

    const selectedIngredients = splitInput(ingredients);

    // 折叠面板里已设置的偏好摘要，显示在「更多偏好」标题旁
    const prefSummary = [
        `${serves}人`,
        `≤${maxTime}分钟`,
        ...tastes,
        ...healthGoals,
        ...cookware,
    ]
        .filter(Boolean)
        .join(" / ");

    // 点选食材：已选则移除，未选则加入
    const toggleIngredient = (name) => {
        const next = selectedIngredients.includes(name)
            ? selectedIngredients.filter((x) => x !== name)
            : [...selectedIngredients, name];
        setIngredients(next.join("、"));
    };

    const removeIngredient = (name) => {
        setIngredients(
            selectedIngredients.filter((x) => x !== name).join("、"),
        );
    };

    // 手动输入：回车 / 逗号 / 顿号 提交，可一次输入多个
    const commitInput = () => {
        const names = splitInput(ingredientInput);
        if (names.length) {
            mergeIngredients(names);
        }
        setIngredientInput("");
    };

    const handleInputKeyDown = (e) => {
        if (e.key === "Enter" || e.key === "," || e.key === "，") {
            e.preventDefault();
            commitInput();
        } else if (
            e.key === "Backspace" &&
            !ingredientInput &&
            selectedIngredients.length
        ) {
            // 输入框为空时退格，删掉最后一个已选食材
            removeIngredient(selectedIngredients[selectedIngredients.length - 1]);
        }
    };

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
            healthGoals,
            cookware,
        };
        const ctx = {
            ingredients: payload.ingredients,
            clearout: payload.clearout,
            maxTime,
            tastes,
            healthGoals,
            cookware,
        };

        // 立即跳到结果页（先骨架屏），生成与超时/兜底/重试逻辑统一在 store 里。
        setLoading(true);
        navigate("/result");
        await runGenerate({
            serves,
            normalizeMenu,
            aiFn: () => streamAiMenu(payload),
            buildLocal: () => buildLocalMenus(ctx),
        });
        setLoading(false);
    };

    // 来自「饭局共识」的最终菜单，跳到结果页展示
    useEffect(() => {
        if (sharedMenu) {
            setResult({
                loading: false,
                menus: [normalizeMenu(sharedMenu)],
                serves,
                source: null,
                error: "",
            });
            navigate("/result");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                            （点选或输入，可不填）
                        </span>
                    </label>

                    {/* 已选食材 + 内嵌输入：像标签输入框一样 */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-2 py-2 rounded-xl border border-gray-200 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
                        {selectedIngredients.map((name) => (
                            <span
                                key={name}
                                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-orange-50 text-brand text-sm"
                            >
                                {name}
                                <button
                                    type="button"
                                    onClick={() => removeIngredient(name)}
                                    className="w-4 h-4 rounded-full text-brand/70 hover:bg-brand/10 leading-none flex items-center justify-center"
                                    aria-label={`移除${name}`}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                        <input
                            value={ingredientInput}
                            onChange={(e) => setIngredientInput(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            onBlur={commitInput}
                            placeholder={
                                selectedIngredients.length
                                    ? "继续添加…"
                                    : "点下方标签，或输入后回车"
                            }
                            className="flex-1 min-w-[7rem] px-1 py-1 text-sm outline-none bg-transparent"
                        />
                    </div>

                    {/* 常见食材，点选即可 */}
                    <div className="mt-2.5 space-y-2.5">
                        {INGREDIENT_GROUPS.map((g) => (
                            <div key={g.label}>
                                <p className="text-xs text-gray-400 mb-1.5">
                                    {g.label}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {g.items.map((name) => (
                                        <Chip
                                            key={name}
                                            active={selectedIngredients.includes(
                                                name,
                                            )}
                                            onClick={() =>
                                                toggleIngredient(name)
                                            }
                                        >
                                            {name}
                                        </Chip>
                                    ))}
                                </div>
                            </div>
                        ))}
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
                    className="w-full py-3 rounded-xl bg-brand text-white font-semibold shadow-md active:scale-[.98] transition disabled:opacity-60"
                >
                    {loading ? "AI 正在配菜…🍳" : "✨ 生成今日菜单"}
                </button>
            </div>
        </div>
    );
}
