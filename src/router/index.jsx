import { createHashRouter } from "react-router-dom";
import MainLayout from "../components/MainLayout.jsx";
import TodayMenu from "../pages/TodayMenu.jsx";
import MenuResultPage from "../pages/MenuResultPage.jsx";
import FunPick from "../pages/FunPick.jsx";
import Consensus from "../pages/Consensus.jsx";
import Favorites from "../pages/Favorites.jsx";
import DishDetail from "../pages/DishDetail.jsx";
import SharedPick from "../pages/SharedPick.jsx";

// 用 hash 路由：纯静态托管无需服务端 rewrite 配置，刷新不 404。
export const router = createHashRouter([
    {
        path: "/",
        element: <MainLayout />,
        children: [
            { index: true, element: <TodayMenu /> },
            { path: "result", element: <MenuResultPage /> },
            { path: "fun", element: <FunPick /> },
            { path: "consensus", element: <Consensus /> },
            { path: "favorites", element: <Favorites /> },
        ],
    },
    {
        path: "/dish/:id",
        element: <DishDetail />,
    },
    {
        path: "/pick/:code",
        element: <SharedPick />,
    },
]);
