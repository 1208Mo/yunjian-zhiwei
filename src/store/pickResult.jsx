import { createContext, useContext, useRef, useState } from "react";

// 「TA来挑菜」生成结果的全局态：把生成中/结果提到 Provider，
// 这样在生成过程中切换底部 Tab 也不会中断，回到页面即看到进度或结果。
const PickResultContext = createContext(null);

const EMPTY = {
    loading: false,
    intro: "",
    meals: null, // [{meal, emoji, dishes:[]}]
    source: null, // "ai" | "local"
    startedAt: 0, // 生成开始时间戳，供进度条按真实经过时间计算
};

export function PickResultProvider({ children }) {
    const [state, setState] = useState(EMPTY);
    // 生成完成后的回调（如自动推送给 TA），由页面注入
    const onDoneRef = useRef(null);

    // 执行一次生成。
    // run = { aiFn:()=>Promise<{menu}>, normalizeMeals, buildLocal, onDone? }
    const runPick = async (run) => {
        setState({
            loading: true,
            intro: "",
            meals: null,
            source: null,
            startedAt: Date.now(),
        });
        try {
            const { menu } = await run.aiFn();
            const meals = run.normalizeMeals(menu.meals);
            const intro = menu.intro || "今天想吃点啥，你来挑～";
            setState({ loading: false, intro, meals, source: "ai", startedAt: 0 });
            run.onDone?.(meals, intro);
        } catch {
            const meals = run.buildLocal();
            const intro = "今天想吃点啥，你来挑～";
            setState({ loading: false, intro, meals, source: "local", startedAt: 0 });
            run.onDone?.(meals, intro);
        }
    };

    return (
        <PickResultContext.Provider value={{ ...state, setState, runPick, onDoneRef }}>
            {children}
        </PickResultContext.Provider>
    );
}

export function usePickResult() {
    return useContext(PickResultContext);
}
