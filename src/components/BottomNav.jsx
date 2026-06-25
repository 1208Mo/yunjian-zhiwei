import { NavLink } from "react-router-dom";
import { useMenuResult } from "../store/menuResult.jsx";
import { usePickResult } from "../store/pickResult.jsx";
import { useFunResult } from "../store/funResult.jsx";

const TABS = [
    { to: "/", label: "今日菜单", icon: "🍽️", end: true },
    { to: "/fun", label: "趣味荐餐", icon: "🎲" },
    { to: "/consensus", label: "TA来挑菜", icon: "💕" },
    { to: "/favorites", label: "我的收藏", icon: "⭐" },
];

export default function BottomNav() {
    const { result } = useMenuResult();
    const pick = usePickResult();
    const fun = useFunResult();
    // 哪些 Tab 正在后台生成 → 角标
    const busy = {
        "/": result.loading,
        "/fun": fun.loading,
        "/consensus": pick.loading,
    };

    return (
        <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-white/95 backdrop-blur border-t border-gray-100 px-2 py-2 flex">
            {TABS.map((t) => (
                <NavLink
                    key={t.to}
                    to={t.to}
                    end={t.end}
                    className={({ isActive }) =>
                        "relative flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition " +
                        (isActive ? "text-brand" : "text-gray-400")
                    }
                >
                    {({ isActive }) => (
                        <>
                            <span className="relative">
                                <span
                                    className={
                                        "text-xl block transition-transform duration-200 " +
                                        (isActive
                                            ? "scale-125 -translate-y-0.5"
                                            : "")
                                    }
                                >
                                    {t.icon}
                                </span>
                                {busy[t.to] && (
                                    <span className="absolute -top-0.5 -right-1.5 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-60" />
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand" />
                                    </span>
                                )}
                            </span>
                            <span className="text-[11px] font-medium">
                                {t.label}
                            </span>
                            {isActive && (
                                <span className="w-1 h-1 rounded-full bg-brand animate-bounce-in" />
                            )}
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}
