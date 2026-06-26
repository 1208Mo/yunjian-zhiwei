import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RECIPES } from "../data/recipes.js";
import { normalizeDish } from "../utils/menu.js";
import { streamAiPick, createRoom, fetchRoom } from "../api/client.js";
import { registerDishes } from "../utils/dishRegistry.js";
import { copyText } from "../utils/clipboard.js";
import { usePickResult } from "../store/pickResult.jsx";
import ProgressLoader from "../components/ProgressLoader.jsx";
import Chip from "../components/Chip.jsx";

const TASTE_OPTIONS = ["家常", "川味", "酸甜", "麻辣", "清淡", "清爽", "浓郁", "鲜"];
const CUISINE_OPTIONS = [
    "粤菜", "川菜", "湘菜", "鲁菜", "苏菜", "浙菜", "闽菜", "徽菜", "东北菜", "西北菜",
];
const MEAL_EMOJI = { 早餐: "🌅", 午餐: "🍱", 晚餐: "🌙" };
const ROOM_KEY = "yjzw.roomCode.v1"; // 固定暗号存本地，下次自动复用

// 本地兜底：按三餐各随机出 3 道菜
function buildLocalMeals() {
    const meals = ["早餐", "午餐", "晚餐"];
    return meals.map((meal) => {
        const pool = [...RECIPES].sort(() => Math.random() - 0.5).slice(0, 3);
        return {
            meal,
            emoji: MEAL_EMOJI[meal],
            dishes: pool.map((r) => normalizeDish(r)),
        };
    });
}

export default function Consensus() {
    const navigate = useNavigate();
    const pickStore = usePickResult();
    // 生成态与结果全部来自全局 Provider，切 Tab 不中断
    const { loading, intro, meals, startedAt, runPick } = pickStore;

    const [tastes, setTastes] = useState([]);
    const [cuisines, setCuisines] = useState([]); // 菜系，可多选
    const [note, setNote] = useState("");
    const [dislikes, setDislikes] = useState(""); // 忌口，「、」分隔
    // 每个餐次选中的菜 id：{ 早餐: id, 午餐: id, 晚餐: id }
    const [picked, setPicked] = useState({});

    // 固定暗号分享：本地存一个暗号，菜单生成后自动推送到该房间，
    // TA 用同一个暗号链接，刷新就能看到最新菜单；TA 的选择轮询同步回来。
    const [roomCode, setRoomCode] = useState(
        () => (localStorage.getItem(ROOM_KEY) || "").toUpperCase(),
    );
    const [codeInput, setCodeInput] = useState("");
    const [pushing, setPushing] = useState(false);
    const [pushed, setPushed] = useState(false); // 当前菜单是否已推给 TA
    const [shareErr, setShareErr] = useState("");
    const [copied, setCopied] = useState(false);
    const pollRef = useRef(null);

    const shareUrl = roomCode
        ? `${window.location.origin}${window.location.pathname}#/pick/${roomCode}`
        : "";

    // 设定/修改暗号
    const saveCode = () => {
        const c = codeInput.trim().toUpperCase();
        if (!/^[A-Z0-9]{2,16}$/.test(c)) {
            setShareErr("暗号只能是 2-16 位字母或数字");
            return;
        }
        setShareErr("");
        localStorage.setItem(ROOM_KEY, c);
        setRoomCode(c);
        setCodeInput("");
        setPushed(false);
    };

    const clearCode = () => {
        localStorage.removeItem(ROOM_KEY);
        setRoomCode("");
        setPushed(false);
    };

    // 把当前菜单推送到固定房间（覆盖更新，清空旧选择）
    const pushMenu = async (ms, introText) => {
        if (!roomCode || !ms) {
            return;
        }
        setPushing(true);
        setShareErr("");
        try {
            await createRoom(
                { intro: introText, meals: ms },
                "你的另一半",
                roomCode,
            );
            setPicked({});
            setPushed(true);
        } catch (e) {
            setShareErr(e.message || "推送失败，稍后再试");
        } finally {
            setPushing(false);
        }
    };

    // 轮询 TA 的选择（设了暗号就一直轮询，每 4 秒）
    useEffect(() => {
        if (!roomCode) {
            return undefined;
        }
        const tick = async () => {
            try {
                const room = await fetchRoom(roomCode);
                setPicked(room.picks || {});
            } catch {
                // 房间还没建或偶发失败，忽略
            }
        };
        tick();
        pollRef.current = setInterval(tick, 4000);
        return () => clearInterval(pollRef.current);
    }, [roomCode]);

    // 菜单生成后登记菜品，供详情页按 id 取用
    useEffect(() => {
        (meals || []).forEach((m) => registerDishes(m.dishes));
    }, [meals]);

    const copyLink = async () => {
        const ok = await copyText(shareUrl);
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } else {
            setShareErr("复制失败，请手动长按链接复制");
        }
    };

    const toggleTaste = (t) => {
        setTastes((prev) =>
            prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
        );
    };

    const normalizeMeals = (raw) =>
        (raw || []).map((m) => ({
            meal: m.meal || "一餐",
            emoji: m.emoji || MEAL_EMOJI[m.meal] || "🍽️",
            dishes: (m.dishes || []).map((d) => normalizeDish(d)),
        }));

    const generate = async () => {
        setPicked({});
        setPushed(false);
        setShareErr("");
        // 生成放到全局 store 执行；完成后若设了暗号自动推给 TA。
        // 切换 Tab 不会中断这次生成。
        runPick({
            aiFn: () =>
                streamAiPick({
                    tastes,
                    cuisines,
                    note,
                    dislikes: dislikes
                        .split(/[,，、\s]+/)
                        .filter(Boolean),
                }),
            normalizeMeals,
            buildLocal: buildLocalMeals,
            onDone: (ms, introText) => {
                if (roomCode) {
                    pushMenu(ms, introText);
                }
            },
        });
    };

    const pick = (meal, id) => {
        setPicked((prev) => ({
            ...prev,
            [meal]: prev[meal] === id ? undefined : id,
        }));
    };

    const pickedCount = Object.values(picked).filter(Boolean).length;

    return (
        <div className="space-y-5">
            <header className="bg-gradient-to-br from-rose-400 to-pink-600 rounded-3xl p-5 text-white shadow-lg">
                <h1 className="text-xl font-bold">今天吃什么 · 你来挑 💕</h1>
                <p className="text-sm text-white/85 mt-1">
                    我准备好菜单，每顿你选一道喜欢的
                </p>
            </header>

            {/* 偏好设置 + 生成 */}
            {!meals && !loading && (
                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            😋 TA 的口味偏好
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {TASTE_OPTIONS.map((t) => (
                                <Chip
                                    key={t}
                                    active={tastes.includes(t)}
                                    onClick={() => toggleTaste(t)}
                                >
                                    {t}
                                </Chip>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            🍲 菜系{" "}
                            <span className="text-ink-400 font-normal">
                                （可多选，不选=不限）
                            </span>
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {CUISINE_OPTIONS.map((c) => (
                                <Chip
                                    key={c}
                                    active={cuisines.includes(c)}
                                    onClick={() =>
                                        setCuisines((prev) =>
                                            prev.includes(c)
                                                ? prev.filter((x) => x !== c)
                                                : [...prev, c],
                                        )
                                    }
                                >
                                    {c}
                                </Chip>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            🚫 TA 的忌口
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {["鱼", "虾", "香菜", "葱", "蒜", "内脏", "辣椒", "羊肉"].map(
                                (t) => {
                                    const list = dislikes
                                        .split(/[,，、\s]+/)
                                        .filter(Boolean);
                                    const on = list.includes(t);
                                    return (
                                        <Chip
                                            key={t}
                                            active={on}
                                            onClick={() =>
                                                setDislikes(
                                                    (on
                                                        ? list.filter(
                                                              (x) => x !== t,
                                                          )
                                                        : [...list, t]
                                                    ).join("、"),
                                                )
                                            }
                                        >
                                            {t}
                                        </Chip>
                                    );
                                },
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            📝 想对 TA 说 / 特别要求
                        </label>
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="比如：最近想吃辣的、别太油腻"
                            className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-rose-400"
                        />
                    </div>
                    <button
                        onClick={generate}
                        className="w-full py-3 rounded-xl bg-rose-500 text-white font-semibold shadow-md active:scale-[.98] transition"
                    >
                        🍽️ 生成今日菜单给 TA 挑
                    </button>
                </div>
            )}

            {loading && (
                <div className="space-y-3">
                    <p className="text-sm text-rose-500 text-center">
                        正在用心准备菜单…💗
                    </p>
                    <ProgressLoader accent="rose" startedAt={startedAt} />
                </div>
            )}

            {!loading && meals && (
                <div className="space-y-5">
                    <p className="text-sm text-rose-500 bg-rose-50 rounded-xl px-3 py-2.5">
                        💌 {intro}
                    </p>

                    {/* 固定暗号分享：设一次暗号，以后每次生成自动推给 TA，TA 刷新即可看到 */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                        {!roomCode ? (
                            <>
                                <p className="text-sm text-gray-600">
                                    设一个你俩的专属暗号（比如名字缩写），把链接发 TA 一次。
                                    以后你换菜单，TA 刷新页面就能看到，不用再发链接 💕
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        value={codeInput}
                                        onChange={(e) =>
                                            setCodeInput(e.target.value)
                                        }
                                        placeholder="自定义暗号，如 XMTT"
                                        maxLength={16}
                                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-rose-400"
                                    />
                                    <button
                                        onClick={saveCode}
                                        className="px-4 rounded-xl bg-rose-500 text-white text-sm whitespace-nowrap"
                                    >
                                        设定
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-medium text-gray-700">
                                    暗号{" "}
                                    <span className="text-rose-500">
                                        {roomCode}
                                    </span>
                                    <span className="text-gray-400 font-normal">
                                        {pushing
                                            ? " · 正在推送给 TA…"
                                            : pushed
                                              ? " · 已推送，TA 刷新即可看到"
                                              : " · 这桌菜单还没推给 TA"}
                                    </span>
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={shareUrl}
                                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-500 bg-gray-50"
                                    />
                                    <button
                                        onClick={copyLink}
                                        className="px-4 rounded-xl bg-rose-500 text-white text-sm whitespace-nowrap"
                                    >
                                        {copied ? "已复制" : "复制链接"}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-400">
                                        链接只需发 TA 一次。TA 把它存浏览器/加桌面，刷新就同步。
                                    </p>
                                    <button
                                        onClick={clearCode}
                                        className="text-xs text-gray-400 underline whitespace-nowrap ml-2"
                                    >
                                        换暗号
                                    </button>
                                </div>
                                {!pushed && !pushing && (
                                    <button
                                        onClick={() => pushMenu(meals, intro)}
                                        className="w-full py-2.5 rounded-xl bg-rose-500 text-white font-medium active:scale-[.98] transition"
                                    >
                                        📤 把这桌菜单推给 TA
                                    </button>
                                )}
                            </>
                        )}
                        {shareErr && (
                            <p className="text-xs text-amber-600">{shareErr}</p>
                        )}
                    </div>

                    {meals.map((m) => (
                        <div key={m.meal} className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-gray-800">
                                    {m.emoji} {m.meal}
                                </h2>
                                {picked[m.meal] && (
                                    <span className="text-xs text-rose-500">
                                        已选 ✓
                                    </span>
                                )}
                            </div>
                            {m.dishes.map((d) => {
                                const active = picked[m.meal] === d.id;
                                return (
                                    <div
                                        key={d.id}
                                        className={
                                            "rounded-2xl border transition " +
                                            (active
                                                ? "border-rose-400 ring-1 ring-rose-300"
                                                : "border-transparent")
                                        }
                                    >
                                        <div className="bg-white rounded-2xl p-4 shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <div className="text-2xl">
                                                    {d.emoji}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="font-semibold text-gray-800">
                                                            {d.name}
                                                        </h3>
                                                        <span className="text-xs text-gray-400 shrink-0">
                                                            ⏱{d.time}分钟
                                                        </span>
                                                    </div>
                                                    {d.reasons.length > 0 && (
                                                        <p className="text-xs text-rose-500 mt-1">
                                                            💗 {d.reasons[0]}
                                                        </p>
                                                    )}
                                                    <div className="flex gap-2 mt-2.5">
                                                        <button
                                                            onClick={() =>
                                                                pick(
                                                                    m.meal,
                                                                    d.id,
                                                                )
                                                            }
                                                            disabled={Boolean(
                                                                roomCode,
                                                            )}
                                                            className={
                                                                "flex-1 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 " +
                                                                (active
                                                                    ? "bg-rose-500 text-white"
                                                                    : "bg-rose-50 text-rose-500")
                                                            }
                                                        >
                                                            {active
                                                                ? "✓ 就吃这个"
                                                                : roomCode
                                                                  ? "等 TA 选"
                                                                  : "选它"}
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                navigate(
                                                                    `/dish/${d.id}`,
                                                                )
                                                            }
                                                            className="px-4 py-2 rounded-xl text-sm text-gray-500 bg-gray-50"
                                                        >
                                                            做法
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {/* 已选小结 */}
                    {pickedCount > 0 && (
                        <div className="bg-white rounded-2xl p-4 shadow-sm">
                            <h3 className="font-semibold text-gray-800 mb-2">
                                💝 TA 选好了
                            </h3>
                            <ul className="space-y-1.5">
                                {meals.map((m) => {
                                    const d = m.dishes.find(
                                        (x) => x.id === picked[m.meal],
                                    );
                                    if (!d) {
                                        return null;
                                    }
                                    return (
                                        <li
                                            key={m.meal}
                                            className="text-sm text-gray-600 flex items-center gap-2"
                                        >
                                            <span className="text-gray-400">
                                                {m.emoji} {m.meal}
                                            </span>
                                            <span className="font-medium text-gray-800">
                                                {d.emoji} {d.name}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    <button
                        onClick={generate}
                        className="w-full py-3 rounded-xl border border-rose-200 text-rose-500 font-medium active:bg-rose-50"
                    >
                        ↺ 换一批菜单
                    </button>
                </div>
            )}
        </div>
    );
}
