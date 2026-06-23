import { NavLink } from "react-router-dom";

const TABS = [
    { to: "/", label: "今日菜单", icon: "🍽️", end: true },
    { to: "/fun", label: "趣味荐餐", icon: "🎲" },
    { to: "/consensus", label: "饭局共识", icon: "🗳️" },
];

export default function BottomNav() {
    return (
        <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-white/95 backdrop-blur border-t border-gray-100 px-2 py-2 flex">
            {TABS.map((t) => (
                <NavLink
                    key={t.to}
                    to={t.to}
                    end={t.end}
                    className={({ isActive }) =>
                        "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition " +
                        (isActive ? "text-brand" : "text-gray-400")
                    }
                >
                    <span className="text-xl">{t.icon}</span>
                    <span className="text-[11px] font-medium">{t.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
