import { createContext, useContext, useEffect, useRef, useState } from "react";

// 今日菜单生成结果的跨页共享 + 持久化。
// TodayMenu 调 generate() 触发生成并跳 /result；结果存 localStorage，
// 刷新或切走再回来都不丢；失败有错误态，可重试或用本地兜底。
const MenuResultContext = createContext(null);

const STORE_KEY = "yjzw.menuResult.v1";
const EMPTY = {
    loading: false,
    menus: null,
    serves: 1,
    source: null, // "ai" | "local"
    error: "", // 生成失败时的提示
};

function loadPersisted() {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (!raw) {
            return EMPTY;
        }
        const data = JSON.parse(raw);
        // loading/error 不持久化（刷新后应是稳定结果态）
        return { ...EMPTY, ...data, loading: false, error: "" };
    } catch {
        return EMPTY;
    }
}

export function MenuResultProvider({ children }) {
    const [result, setResult] = useState(loadPersisted);
    // 记录最近一次生成的入参，供「重试」复用
    const lastRunRef = useRef(null);

    // 结果稳定后持久化（生成中/出错态不写）
    useEffect(() => {
        if (result.loading || result.error || !result.menus) {
            return;
        }
        try {
            localStorage.setItem(
                STORE_KEY,
                JSON.stringify({
                    menus: result.menus,
                    serves: result.serves,
                    source: result.source,
                }),
            );
        } catch {
            // 存储不可用则忽略
        }
    }, [result]);

    // 执行一次生成。
    // run = { serves, aiFn:()=>Promise<{menu}>, buildLocal:()=>menus[] }
    const runGenerate = async (run) => {
        lastRunRef.current = run;
        setResult({
            loading: true,
            menus: null,
            serves: run.serves,
            source: null,
            error: "",
        });
        try {
            const { menu } = await run.aiFn();
            setResult({
                loading: false,
                menus: [run.normalizeMenu(menu)],
                serves: run.serves,
                source: "ai",
                error: "",
            });
        } catch (e) {
            const isTimeout = e?.name === "AbortError" || /超时/.test(e?.message || "");
            // 本地兜底永远能出结果，但保留错误提示让用户知道 AI 没成功
            try {
                const menus = run.buildLocal();
                setResult({
                    loading: false,
                    menus,
                    serves: run.serves,
                    source: "local",
                    error: isTimeout
                        ? "AI 响应超时，先用本地推荐为你兜底"
                        : "AI 服务暂不可用，先用本地推荐为你兜底",
                });
            } catch {
                setResult({
                    loading: false,
                    menus: null,
                    serves: run.serves,
                    source: null,
                    error: "生成失败了，点下方重试一下～",
                });
            }
        }
    };

    const retry = () => {
        if (lastRunRef.current) {
            runGenerate(lastRunRef.current);
        }
    };

    return (
        <MenuResultContext.Provider
            value={{ result, setResult, runGenerate, retry, canRetry: !!lastRunRef.current }}
        >
            {children}
        </MenuResultContext.Provider>
    );
}

export function useMenuResult() {
    return useContext(MenuResultContext);
}
