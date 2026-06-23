// 开饭卡：可一键复制分享的成果卡片。
export default function KaiFanCard({ menu, serves }) {
    const dishes = menu.dishes;
    const today = new Date().toLocaleDateString("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "long",
    });

    const handleShare = () => {
        const text = [
            "🍽️ 云间知味 · 开饭卡",
            today,
            "",
            ...dishes.map((d) => `${d.emoji} ${d.name}`),
            "",
            `适合${serves}人 · 来云间知味决定今天吃什么`,
        ].join("\n");

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            alert("开饭卡文案已复制，去分享吧～");
        }
    };

    return (
        <div className="rounded-2xl p-5 shadow-lg bg-gradient-to-br from-amber-400 via-brand-400 to-brand-600 text-white animate-pop">
            <div className="flex items-center justify-between">
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    云间知味 · 开饭卡
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
                <span className="text-xs text-white/80">
                    适合 {serves} 人 · 吃饭更有谱
                </span>
                <button
                    onClick={handleShare}
                    className="text-sm bg-white text-brand-700 font-semibold px-4 py-1.5 rounded-full active:scale-95 transition"
                >
                    分享
                </button>
            </div>
        </div>
    );
}
