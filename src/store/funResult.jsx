import { createContext, useContext, useState } from "react";

// 「趣味荐餐」生成结果的全局态：把生成中/结果提到 Provider，
// 这样在生成过程中切换底部 Tab 也不会中断，回到页面即看到进度或结果。
const FunResultContext = createContext(null);

const EMPTY = {
    loading: false,
    result: null, // { title, line, dishes:[] }
    source: null, // "ai" | "local"
    startedAt: 0, // 生成开始时间戳，供进度条按真实经过时间计算
};

export function FunResultProvider({ children }) {
    const [state, setState] = useState(EMPTY);

    // 执行一次生成。
    // run = { aiFn:()=>Promise<{result}>, normalize, buildLocal }
    const runFun = async (run) => {
        setState({ loading: true, result: null, source: null, startedAt: Date.now() });
        try {
            const { result } = await run.aiFn();
            setState({
                loading: false,
                result: run.normalize(result),
                source: "ai",
                startedAt: 0,
            });
        } catch {
            setState({
                loading: false,
                result: run.buildLocal(),
                source: "local",
                startedAt: 0,
            });
        }
    };

    return (
        <FunResultContext.Provider value={{ ...state, runFun }}>
            {children}
        </FunResultContext.Provider>
    );
}

export function useFunResult() {
    return useContext(FunResultContext);
}
