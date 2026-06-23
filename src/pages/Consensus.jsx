import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RECIPES } from "../data/recipes.js";
import { normalizeDish } from "../utils/menu.js";
import { useSharedMenu } from "../store/sharedMenu.jsx";
import DishCard from "../components/DishCard.jsx";

export default function Consensus() {
    const navigate = useNavigate();
    const { setSharedMenu } = useSharedMenu();

    const [people, setPeople] = useState(["我", "TA"]);
    const [newName, setNewName] = useState("");
    const [candidates, setCandidates] = useState([]);
    const [votes, setVotes] = useState({});
    const [stage, setStage] = useState("setup"); // setup | vote | result

    const genCandidates = () => {
        const pool = [...RECIPES]
            .sort(() => Math.random() - 0.5)
            .slice(0, 6);
        setCandidates(pool);
        setVotes({});
        setStage("vote");
    };

    const vote = (id) => {
        setVotes((v) => ({ ...v, [id]: (v[id] || 0) + 1 }));
    };

    const finalize = () => {
        const ranked = candidates
            .map((r) => ({ r, v: votes[r.id] || 0 }))
            .sort((a, b) => b.v - a.v);
        const top = ranked
            .slice(0, Math.min(4, candidates.length))
            .map((x) => normalizeDish({ ...x.r, reason: `${x.v} 票` }));

        // 汇总到共享菜单，跳转到今日菜单页生成开饭卡
        setSharedMenu({
            title: "饭局共识菜单",
            summary: `${people.length} 人投票产生 · 已按得票排序`,
            dishes: top,
        });
        setStage("result");
    };

    const addPerson = () => {
        const name = newName.trim();
        if (name) {
            setPeople([...people, name]);
            setNewName("");
        }
    };

    return (
        <div className="space-y-5">
            <header className="bg-gradient-to-br from-rose-400 to-pink-600 rounded-3xl p-5 text-white shadow-lg">
                <h1 className="text-xl font-bold">饭局共识 🗳️</h1>
                <p className="text-sm text-white/85 mt-1">
                    情侣/室友/家庭，投票选出大家都满意的菜单
                </p>
            </header>

            {stage === "setup" && (
                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            👨‍👩‍👧 参与的人
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {people.map((p, i) => (
                                <span
                                    key={`${p}-${i}`}
                                    className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 text-sm flex items-center gap-1.5"
                                >
                                    {p}
                                    <button
                                        onClick={() =>
                                            setPeople(
                                                people.filter(
                                                    (_, j) => j !== i,
                                                ),
                                            )
                                        }
                                        className="text-rose-300"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-3">
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="加一个人"
                                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-rose-400"
                            />
                            <button
                                onClick={addPerson}
                                className="px-4 rounded-xl bg-rose-500 text-white text-sm"
                            >
                                添加
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={genCandidates}
                        className="w-full py-3 rounded-xl bg-rose-500 text-white font-semibold shadow-md active:scale-[.98] transition"
                    >
                        🍱 生成候选菜单去投票
                    </button>
                </div>
            )}

            {stage === "vote" && (
                <div className="space-y-3">
                    <p className="text-sm text-gray-500 text-center">
                        大家轮流点心仪的菜（可重复点表示加票）
                    </p>
                    {candidates.map((r) => (
                        <button
                            key={r.id}
                            onClick={() => vote(r.id)}
                            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-rose-50 flex items-center gap-3 active:scale-[.99] transition text-left"
                        >
                            <div className="text-2xl">{r.emoji}</div>
                            <div className="flex-1">
                                <div className="font-semibold text-gray-800">
                                    {r.name}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {r.category} · {r.tags.join("、")}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-rose-500 font-bold text-lg">
                                    {votes[r.id] || 0}
                                </span>
                                <span className="text-rose-300">❤️</span>
                            </div>
                        </button>
                    ))}
                    <button
                        onClick={finalize}
                        className="w-full py-3 rounded-xl bg-rose-500 text-white font-semibold shadow-md active:scale-[.98] transition mt-2"
                    >
                        ✅ 投完了，AI 汇总最终菜单
                    </button>
                </div>
            )}

            {stage === "result" && (
                <div className="space-y-3 animate-pop">
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h2 className="font-bold text-gray-800">
                            🎉 大家的共识菜单
                        </h2>
                        <p className="text-sm text-rose-500 mt-1">
                            已按得票排序，点下方按钮去「今日菜单」生成开饭卡
                        </p>
                    </div>
                    {candidates
                        .map((r) => ({ r, v: votes[r.id] || 0 }))
                        .sort((a, b) => b.v - a.v)
                        .slice(0, 4)
                        .map((x, i) => (
                            <DishCard
                                key={x.r.id}
                                item={normalizeDish({
                                    ...x.r,
                                    reason: `${x.v} 票`,
                                })}
                                delay={i * 60}
                            />
                        ))}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setStage("setup")}
                            className="py-2.5 rounded-xl bg-white border border-rose-200 text-rose-500 font-medium"
                        >
                            再来一局
                        </button>
                        <button
                            onClick={() => navigate("/")}
                            className="py-2.5 rounded-xl bg-rose-500 text-white font-medium"
                        >
                            去生成开饭卡 ›
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
