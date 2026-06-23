import { RouterProvider } from "react-router-dom";
import { router } from "./router/index.jsx";
import { SharedMenuProvider } from "./store/sharedMenu.jsx";

export default function App() {
    return (
        <SharedMenuProvider>
            <RouterProvider router={router} />
        </SharedMenuProvider>
    );
}
