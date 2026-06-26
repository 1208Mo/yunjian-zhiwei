// 开饭卡：可一键复制分享的成果卡片。
import { aggregateShopping } from "../utils/menu.js";
import { copyText } from "../utils/clipboard.js";
import { useToast } from "../store/toast.jsx";

export default function KaiFanCard({ menu, serves }) {
    const dishes = menu.dishes;
    const toast = useToast();
    const today = new Date().toLocaleDateString("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "long",
    });

    // 统计：总耗时（取最长那道，因为可并行；同时给累计参考）、荤素分布
    const maxTime = dishes.reduce((m, d) => Math.max(m, d.time || 0), 0);
    const meatCount = dishes.filter((d) => d.category === "荤菜").length;
    const vegCount = dishes.filter((d) => d.category === "素菜").length;
    const soupCount = dishes.filter((d) => d.category === "汤").length;
    const stapleCount = dishes.filter((d) => d.category === "主食").length;

    const composition = [
        meatCount && `${meatCount}荤`,
        vegCount && `${vegCount}素`,
        soupCount && `${soupCount}汤`,
        stapleCount && `${stapleCount}主食`,
    ]
        .filter(Boolean)
        .join(" ");

    const shopping = aggregateShopping(dishes);

    const handleShare = async () => {
        const lines = [
            `🍽️ 开饭卡 · ${today}`,
            "",
            "【今日菜单】",
            ...dishes.map((d) => `${d.emoji} ${d.name}`),
            "",
            `⏱ 约 ${maxTime} 分钟搞定${composition ? ` · ${composition}` : ""}`,
        ];
        if (shopping.length) {
            lines.push("", "【采购清单】");
            shopping.forEach((i) => lines.push(`· ${i.name} ${i.amount}${i.unit}`));
        }
        const text = lines.join("\n");
        const ok = await copyText(text);
        toast(ok ? "开饭卡已复制，去分享吧" : "复制失败，请长按手动复制", ok ? "success" : "error");
    };

    return (
        <div className="rounded-2xl p-5 shadow-lg bg-gradient-to-br from-amber-400 via-brand-400 to-brand-600 text-white animate-pop">
            <div className="flex items-center justify-between">
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    开饭卡
                </span>
                <span className="text-xs text-white/80">{today}</span>
            </div>

            <div className="mt-4 space-y-1.5">
                {dishes.map((d) => (
                    <div
                        key={d.id}
                        className="flex items-center justify-between"
                    >
                        <span className="text-lg">
                            {d.emoji} {d.name}
                        </span>
                        <span className="text-xs text-white/70">
                            {d.category}
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/25 flex items-center justify-between">
                <span className="text-xs text-white/85">
                    约 {maxTime} 分钟{composition ? ` · ${composition}` : ""}
                </span>
                <button
                    onClick={handleShare}
                    className="text-sm bg-white text-brand-700 font-semibold px-4 py-1.5 rounded-full active:scale-95 transition"
                >
                    复制
                </button>
            </div>
        </div>
    );
}
