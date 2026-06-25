import { useEffect, useRef, useState } from "react";

// 带进度的趣味加载条：用预估时长驱动进度增长，接近末尾自动放缓并停在 ~95%，
// 等真实结果返回（组件被卸载）即结束。配跳动的大厨 emoji + 文案轮播，缓解长等待焦虑。
//
// props:
//   estimateMs: 预估总耗时（默认 40s，贴合模型实际响应）
//   startedAt: 生成开始时间戳。传入则进度按真实经过时间算（切 Tab 回来不重置）；
//              不传则用组件挂载时间。
//   hints: 文案轮播
//   accent: "brand" | "rose"
const DEFAULT_HINTS = [
    { emoji: "🧊", text: "正在翻看你的冰箱…" },
    { emoji: "🥬", text: "盘算荤素搭配…" },
    { emoji: "🔪", text: "琢磨刀工与火候…" },
    { emoji: "⏱", text: "估算每道菜的时间…" },
    { emoji: "🛒", text: "凑齐采购清单…" },
    { emoji: "✨", text: "马上就好啦～" },
];

const ACCENT = {
    brand: {
        bar: "from-brand-400 via-brand to-brand-600",
        text: "text-brand",
        track: "bg-orange-100",
        glow: "shadow-[0_0_12px_rgba(236,116,36,.5)]",
    },
    rose: {
        bar: "from-rose-300 via-rose-400 to-rose-600",
        text: "text-rose-500",
        track: "bg-rose-100",
        glow: "shadow-[0_0_12px_rgba(244,63,94,.45)]",
    },
};

export default function ProgressLoader({
    estimateMs = 40000,
    startedAt,
    hints = DEFAULT_HINTS,
    accent = "brand",
}) {
    const a = ACCENT[accent] || ACCENT.brand;
    const [pct, setPct] = useState(5);
    const [hintIdx, setHintIdx] = useState(0);
    // 以传入的开始时间为准，没传才用挂载时间。useRef 保证同一次挂载内稳定。
    const startRef = useRef(startedAt || Date.now());

    // startedAt 变化（新一轮生成）时重置基准
    useEffect(() => {
        if (startedAt) {
            startRef.current = startedAt;
        }
    }, [startedAt]);

    // 进度：用 1 - e^(-t/τ) 形式逼近，前快后慢，渐近但不超过 95%
    useEffect(() => {
        const tau = estimateMs / 2.2;
        const tick = () => {
            const t = Date.now() - startRef.current;
            const target = 95 * (1 - Math.exp(-t / tau));
            setPct(Math.max(5, Math.min(95, target)));
        };
        tick();
        const timer = setInterval(tick, 120);
        return () => clearInterval(timer);
    }, [estimateMs]);

    // 文案轮播
    useEffect(() => {
        if (!hints?.length) {
            return undefined;
        }
        const t = setInterval(() => {
            setHintIdx((i) => (i + 1) % hints.length);
        }, 2200);
        return () => clearInterval(t);
    }, [hints]);

    const cur = hints?.[hintIdx] || { emoji: "🍳", text: "正在生成…" };

    return (
        <div className="bg-white rounded-3xl p-7 shadow-sm flex flex-col items-center">
            {/* 跳动的大 emoji + 漂浮的小食材 */}
            <div className="relative w-24 h-24 mb-4">
                <div className="absolute inset-0 flex items-center justify-center text-5xl animate-float">
                    {cur.emoji}
                </div>
                <span className="absolute -top-1 left-1 text-lg animate-float" style={{ animationDelay: ".4s" }}>
                    🥕
                </span>
                <span className="absolute top-2 -right-1 text-lg animate-float" style={{ animationDelay: ".9s" }}>
                    🍅
                </span>
                <span className="absolute bottom-0 right-2 text-base animate-float" style={{ animationDelay: "1.3s" }}>
                    🌶️
                </span>
            </div>

            <p
                key={hintIdx}
                className={"text-sm font-semibold mb-3 animate-fadeup " + a.text}
            >
                {cur.text}
            </p>

            {/* 进度条：渐变 + 流光 shimmer */}
            <div className="w-full">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-gray-400">
                        AI 正在精心搭配
                    </span>
                    <span className="text-xs text-gray-500 font-medium tabular-nums">
                        {Math.round(pct)}%
                    </span>
                </div>
                <div className={"relative h-2.5 rounded-full overflow-hidden " + a.track}>
                    <div
                        className={
                            "h-full rounded-full bg-gradient-to-r transition-all duration-300 ease-out " +
                            a.bar +
                            " " +
                            a.glow
                        }
                        style={{ width: `${pct}%` }}
                    >
                        {/* 流光 */}
                        <div className="absolute inset-0 overflow-hidden rounded-full">
                            <div className="absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
