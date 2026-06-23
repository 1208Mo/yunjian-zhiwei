export default function Chip({ active, onClick, children }) {
    const base =
        "px-3 py-1.5 rounded-full text-sm border transition";
    const state = active
        ? "bg-brand text-white border-brand shadow-sm"
        : "bg-white text-gray-600 border-gray-200 active:bg-gray-50";

    return (
        <button onClick={onClick} className={`${base} ${state}`}>
            {children}
        </button>
    );
}
