import { useEffect, useState } from "react";

// 加载占位骨架屏：在 AI 生成菜单/荐餐时展示，缓解等待焦虑。
// count 控制占位菜品卡数量；hints 为轮播文案（不传则用默认）。
const DEFAULT_HINTS = [
    "正在翻看你的冰箱…🥬",
    "盘算荤素搭配…🍖",
    "估算每道菜的时间…⏱",
    "凑齐采购清单…🛒",
    "马上就好啦～✨",
];

export default function MenuSkeleton({ count = 3, hints = DEFAULT_HINTS }) {
    const [idx, setIdx] = useState(0);
    useEffect(() => {
        if (!hints?.length) {
            return undefined;
        }
        const t = setInterval(() => {
            setIdx((i) => (i + 1) % hints.length);
        }, 2200);
        return () => clearInterval(t);
    }, [hints]);

    return (
        <div className="space-y-3">
            {hints?.length > 0 && (
                <p
                    key={idx}
                    className="text-sm text-brand text-center transition-opacity duration-300"
                >
                    {hints[idx]}
                </p>
            )}
            <div className="space-y-3 animate-pulse" aria-hidden="true">
                {/* 标题占位 */}
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gray-200" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-4 w-32 bg-gray-200 rounded" />
                        <div className="h-3 w-24 bg-gray-100 rounded" />
                    </div>
                </div>

                {/* 菜品卡占位 */}
                {Array.from({ length: count }).map((_, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-200" />
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="h-4 w-24 bg-gray-200 rounded" />
                                    <div className="h-3 w-12 bg-gray-100 rounded" />
                                </div>
                                <div className="flex gap-1.5">
                                    <div className="h-4 w-12 bg-gray-100 rounded-full" />
                                    <div className="h-4 w-12 bg-gray-100 rounded-full" />
                                </div>
                                <div className="h-3 w-full bg-gray-100 rounded" />
                                <div className="h-3 w-2/3 bg-gray-100 rounded" />
                            </div>
                        </div>
                    </div>
                ))}

                {/* 采购清单占位 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="h-4 w-28 bg-gray-200 rounded mb-3" />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between"
                            >
                                <div className="h-3 w-16 bg-gray-100 rounded" />
                                <div className="h-3 w-8 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
