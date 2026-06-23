import { Outlet } from "react-router-dom";
import BottomNav from "../components/BottomNav.jsx";

// 带底部导航的主框架布局。
export default function MainLayout() {
    return (
        <div className="max-w-md mx-auto min-h-full flex flex-col">
            <main className="flex-1 px-4 pt-5 pb-28 no-scrollbar overflow-y-auto">
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
}
