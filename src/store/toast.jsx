import { createContext, useCallback, useContext, useState } from "react";

// 轻量全局 Toast：底部居中浮出一行提示，自动消失。
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null); // { text, type }

    const show = useCallback((text, type = "success") => {
        setToast({ text, type, key: Date.now() });
        setTimeout(() => setToast(null), 1800);
    }, []);

    return (
        <ToastContext.Provider value={show}>
            {children}
            {toast && (
                <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center pointer-events-none px-6">
                    <div
                        key={toast.key}
                        className={
                            "animate-pop max-w-xs text-center text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg " +
                            (toast.type === "error"
                                ? "bg-ink-800 text-amber-200"
                                : "bg-ink-800 text-white")
                        }
                    >
                        {toast.text}
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
