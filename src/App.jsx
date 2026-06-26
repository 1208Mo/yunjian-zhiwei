import { RouterProvider } from "react-router-dom";
import { router } from "./router/index.jsx";
import { ToastProvider } from "./store/toast.jsx";
import { SharedMenuProvider } from "./store/sharedMenu.jsx";
import { MenuResultProvider } from "./store/menuResult.jsx";
import { PickResultProvider } from "./store/pickResult.jsx";
import { FunResultProvider } from "./store/funResult.jsx";
import { FavoritesProvider } from "./store/favorites.jsx";

export default function App() {
    return (
        <ToastProvider>
            <SharedMenuProvider>
                <MenuResultProvider>
                    <PickResultProvider>
                        <FunResultProvider>
                            <FavoritesProvider>
                                <RouterProvider router={router} />
                            </FavoritesProvider>
                        </FunResultProvider>
                    </PickResultProvider>
                </MenuResultProvider>
            </SharedMenuProvider>
        </ToastProvider>
    );
}
