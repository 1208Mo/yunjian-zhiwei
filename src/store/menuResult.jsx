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
    startedAt: 0, // 本次生成开始时间戳，供进度条按真实经过时间计算
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
    // run = { serves, payload, normalizeMenu, aiFn:(payload)=>Promise<{menu}>, buildLocal:()=>menus[] }
    // payload 为生成入参（含 ingredients/tastes 等），换一换时复用并追加 avoid。
    const runGenerate = async (run) => {
        lastRunRef.current = run;
        setResult({
            loading: true,
            menus: null,
            serves: run.serves,
            source: null,
            error: "",
            startedAt: Date.now(),
        });
        try {
            const { menu } = await run.aiFn(run.payload);
            setResult({
                loading: false,
                menus: [run.normalizeMenu(menu)],
                serves: run.serves,
                source: "ai",
                error: "",
            });
        } catch (e) {
            // 失败时静默回落到本地推荐，不向用户展示「兜底/AI 不可用」之类提示
            try {
                const menus = run.buildLocal();
                setResult({
                    loading: false,
                    menus,
                    serves: run.serves,
                    source: "local",
                    error: "",
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

    // 换一换：复用上次入参，把当前已展示的菜名加进 avoid，避免重复出同样的菜。
    const regenerate = () => {
        const run = lastRunRef.current;
        if (!run) {
            return;
        }
        const prevNames = (result.menus || [])
            .flatMap((m) => (m.dishes || []).map((d) => d.name))
            .filter(Boolean);
        const prevAvoid = run.payload?.avoid || [];
        const avoid = [...new Set([...prevAvoid, ...prevNames])];
        runGenerate({
            ...run,
            payload: { ...run.payload, avoid },
        });
    };

    return (
        <MenuResultContext.Provider
            value={{
                result,
                setResult,
                runGenerate,
                retry,
                regenerate,
                canRetry: !!lastRunRef.current,
            }}
        >
            {children}
        </MenuResultContext.Provider>
    );
}

export function useMenuResult() {
    return useContext(MenuResultContext);
}
