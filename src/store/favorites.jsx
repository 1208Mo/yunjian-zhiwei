import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import { registerDishes } from "../utils/dishRegistry.js";

// 收藏菜谱：用 localStorage 持久化，刷新/重开也在。
// 同时把收藏的菜重新登记进 dishRegistry，使详情页刷新后仍能查到。
const STORAGE_KEY = "yjzw.favorites.v1";
const FavoritesContext = createContext(null);

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

export function FavoritesProvider({ children }) {
    const [favorites, setFavorites] = useState(load);

    // 持久化 + 把收藏登记进 registry（详情页按 id 取用）
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        } catch {
            // 忽略写入失败（如隐私模式）
        }
        registerDishes(favorites);
    }, [favorites]);

    const isFavorite = (id) =>
        favorites.some((d) => String(d.id) === String(id));

    const toggleFavorite = (dish) => {
        setFavorites((prev) => {
            if (prev.some((d) => String(d.id) === String(dish.id))) {
                return prev.filter((d) => String(d.id) !== String(dish.id));
            }
            // 存一份带收藏时间的快照
            return [{ ...dish, savedAt: Date.now() }, ...prev];
        });
    };

    const removeFavorite = (id) => {
        setFavorites((prev) =>
            prev.filter((d) => String(d.id) !== String(id)),
        );
    };

    return (
        <FavoritesContext.Provider
            value={{ favorites, isFavorite, toggleFavorite, removeFavorite }}
        >
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    return useContext(FavoritesContext);
}
