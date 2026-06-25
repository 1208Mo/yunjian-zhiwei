export default function Chip({ active, onClick, children }) {
    const base =
        "px-3 py-1.5 rounded-full text-sm border transition active:scale-95 duration-150";
    const state = active
        ? "bg-brand text-white border-brand"
        : "bg-white text-ink-600 border-ink-200 active:bg-ink-50";

    return (
        <button onClick={onClick} className={`${base} ${state}`}>
            {children}
        </button>
    );
}
