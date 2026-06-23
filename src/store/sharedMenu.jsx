import { createContext, useContext, useState } from "react";

// 跨页共享：饭局共识生成的最终菜单 → 今日菜单页展示。
const SharedMenuContext = createContext(null);

export function SharedMenuProvider({ children }) {
    const [sharedMenu, setSharedMenu] = useState(null);
    return (
        <SharedMenuContext.Provider value={{ sharedMenu, setSharedMenu }}>
            {children}
        </SharedMenuContext.Provider>
    );
}

export function useSharedMenu() {
    return useContext(SharedMenuContext);
}
