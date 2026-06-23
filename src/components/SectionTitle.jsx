export default function SectionTitle({ icon, title, sub }) {
    return (
        <div className="mb-3">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-1.5">
                {icon} {title}
            </h2>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );
}
