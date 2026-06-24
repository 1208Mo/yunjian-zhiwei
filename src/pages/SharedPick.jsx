import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchRoom, submitRoomPick } from "../api/client.js";

const MEAL_EMOJI = { 早餐: "🌅", 午餐: "🍱", 晚餐: "🌙" };

// 分享房间页：TA 打开链接（/pick/:code）后看到对方准备的菜单，每餐选一道。
// 选择会写回后端，发起方那边轮询即可看到。
export default function SharedPick() {
    const { code } = useParams();
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [picks, setPicks] = useState({});
    const [saving, setSaving] = useState("");

    useEffect(() => {
        let alive = true;
        const load = async (first) => {
            try {
                const r = await fetchRoom(code);
                if (!alive) {
                    return;
                }
                setRoom(r);
                // 仅首次用服务端 picks 初始化；之后以本地选择为准，
                // 但若对方推了新菜单（updatedAt 变化）则重置选择。
                setPicks((prev) =>
                    first ? r.picks || {} : prev,
                );
                setError("");
            } catch (e) {
                if (alive && first) {
                    setError(e.message || "链接失效或菜单已过期");
                }
            } finally {
                if (alive && first) {
                    setLoading(false);
                }
            }
        };
        load(true);
        // 轮询：TA 那边换了菜单，这里刷新/挂着都能自动看到最新
        const timer = setInterval(() => load(false), 4000);
        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, [code]);

    // 菜单更新时间变化（对方推了新菜单）→ 清空本地选择
    const lastUpdatedRef = useRef(null);
    useEffect(() => {
        if (!room) {
            return;
        }
        if (
            lastUpdatedRef.current != null &&
            room.updatedAt !== lastUpdatedRef.current
        ) {
            setPicks({});
        }
        lastUpdatedRef.current = room.updatedAt;
    }, [room]);

    const choose = async (meal, dishId) => {
        setPicks((prev) => ({ ...prev, [meal]: dishId }));
        setSaving(meal);
        try {
            await submitRoomPick(code, meal, dishId);
        } catch {
            // 失败不阻塞，保留本地选择
        } finally {
            setSaving("");
        }
    };

    if (loading) {
        return (
            <div className="max-w-md mx-auto px-4 pt-16 text-center text-gray-400">
                正在打开菜单…
            </div>
        );
    }

    if (error || !room) {
        return (
            <div className="max-w-md mx-auto px-4 pt-16 text-center">
                <p className="text-5xl">🍽️</p>
                <p className="text-gray-500 mt-3">{error || "没有找到菜单"}</p>
            </div>
        );
    }

    const meals = room.menu?.meals || [];

    return (
        <div className="max-w-md mx-auto min-h-full px-4 py-6 space-y-5">
            <header className="bg-gradient-to-br from-rose-400 to-pink-600 rounded-3xl p-5 text-white shadow-lg">
                <h1 className="text-xl font-bold">为你准备的菜单 💕</h1>
                <p className="text-sm text-white/85 mt-1">
                    每顿挑一道你想吃的，TA 那边就能看到啦
                </p>
            </header>

            {room.menu?.intro && (
                <p className="text-sm text-rose-500 bg-rose-50 rounded-xl px-3 py-2.5">
                    💌 {room.menu.intro}
                </p>
            )}

            {meals.map((m) => (
                <div key={m.meal} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-gray-800">
                            {m.emoji || MEAL_EMOJI[m.meal]} {m.meal}
                        </h2>
                        {picks[m.meal] != null && (
                            <span className="text-xs text-rose-500">
                                {saving === m.meal ? "保存中…" : "已选 ✓"}
                            </span>
                        )}
                    </div>
                    {(m.dishes || []).map((d) => {
                        const active = picks[m.meal] === d.id;
                        return (
                            <button
                                key={d.id}
                                onClick={() => choose(m.meal, d.id)}
                                className={
                                    "w-full text-left bg-white rounded-2xl p-4 shadow-sm border transition active:scale-[.99] " +
                                    (active
                                        ? "border-rose-400 ring-1 ring-rose-300"
                                        : "border-transparent")
                                }
                            >
                                <div className="flex items-start gap-3">
                                    <div className="text-2xl">{d.emoji}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-800">
                                                {d.name}
                                            </h3>
                                            <span className="text-xs text-gray-400 shrink-0">
                                                {active ? "✓ 就吃这个" : ""}
                                            </span>
                                        </div>
                                        {d.reason && (
                                            <p className="text-xs text-rose-500 mt-1">
                                                💗 {d.reason}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ))}

            <p className="text-center text-xs text-gray-400 pt-2">
                选好就行，TA 会收到你的选择 ☺️
            </p>
        </div>
    );
}
