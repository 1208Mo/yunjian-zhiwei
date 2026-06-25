import { useRef } from "react";
import Chip from "./Chip.jsx";

// 食材标签选择器：已选食材以 chip 展示，可内嵌输入新增、点选下方常见食材、退格删除。
// 受控组件：value 为「、」分隔的字符串，onChange 回传新字符串，与表单其它字段保持一致。
//
// props:
//   value: string                例 "番茄、鸡蛋"
//   onChange: (next:string)=>void
//   groups: [{label, items:[]}]   可选的分组候选；不传则只支持手动输入
//   placeholder / placeholderActive: 输入框占位
//   accent: "brand" | "rose"      配色（今日菜单橙、TA来挑菜粉）
const ACCENT = {
    brand: {
        ring: "focus-within:border-brand focus-within:ring-brand",
        chip: "bg-orange-50 text-brand",
        chipBtn: "text-brand/70 hover:bg-brand/10",
    },
    rose: {
        ring: "focus-within:border-rose-400 focus-within:ring-rose-300",
        chip: "bg-rose-50 text-rose-500",
        chipBtn: "text-rose-400 hover:bg-rose-100",
    },
};

function splitInput(value) {
    return value.split(/[,，、\s]+/).filter(Boolean);
}

export default function IngredientPicker({
    value,
    onChange,
    groups = null,
    placeholder = "点下方标签，或输入后回车",
    placeholderActive = "继续添加…",
    accent = "brand",
}) {
    const inputRef = useRef(null);
    const a = ACCENT[accent] || ACCENT.brand;
    const selected = splitInput(value);

    const setSelected = (list) => onChange(list.join("、"));

    const add = (names) => {
        const merged = [...selected];
        names.forEach((n) => {
            if (n && !merged.includes(n)) {
                merged.push(n);
            }
        });
        setSelected(merged);
    };

    const remove = (name) => setSelected(selected.filter((x) => x !== name));

    const toggle = (name) =>
        selected.includes(name)
            ? remove(name)
            : setSelected([...selected, name]);

    const commitInput = () => {
        const names = splitInput(inputRef.current?.value || "");
        if (names.length) {
            add(names);
        }
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter" || e.key === "," || e.key === "，") {
            e.preventDefault();
            commitInput();
        } else if (
            e.key === "Backspace" &&
            !e.currentTarget.value &&
            selected.length
        ) {
            remove(selected[selected.length - 1]);
        }
    };

    return (
        <div>
            {/* 已选 chip + 内嵌输入 */}
            <div
                className={
                    "flex flex-wrap items-center gap-1.5 px-2 py-2 rounded-xl border border-gray-200 focus-within:ring-1 " +
                    a.ring
                }
            >
                {selected.map((name) => (
                    <span
                        key={name}
                        className={
                            "inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-sm " +
                            a.chip
                        }
                    >
                        {name}
                        <button
                            type="button"
                            onClick={() => remove(name)}
                            className={
                                "w-4 h-4 rounded-full leading-none flex items-center justify-center " +
                                a.chipBtn
                            }
                            aria-label={`移除${name}`}
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    onKeyDown={onKeyDown}
                    onBlur={commitInput}
                    placeholder={selected.length ? placeholderActive : placeholder}
                    className="flex-1 min-w-[7rem] px-1 py-1 text-sm outline-none bg-transparent"
                />
            </div>

            {/* 分组候选 */}
            {groups && (
                <div className="mt-2.5 space-y-2.5">
                    {groups.map((g) => (
                        <div key={g.label}>
                            <p className="text-xs text-gray-400 mb-1.5">
                                {g.label}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {g.items.map((name) => (
                                    <Chip
                                        key={name}
                                        active={selected.includes(name)}
                                        onClick={() => toggle(name)}
                                    >
                                        {name}
                                    </Chip>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
