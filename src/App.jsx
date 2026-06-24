import { RouterProvider } from "react-router-dom";
import { router } from "./router/index.jsx";
import { SharedMenuProvider } from "./store/sharedMenu.jsx";
import { MenuResultProvider } from "./store/menuResult.jsx";
import { FavoritesProvider } from "./store/favorites.jsx";

export default function App() {
    return (
        <SharedMenuProvider>
            <MenuResultProvider>
                <FavoritesProvider>
                    <RouterProvider router={router} />
                </FavoritesProvider>
            </MenuResultProvider>
        </SharedMenuProvider>
    );
}
