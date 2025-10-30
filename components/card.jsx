export function Card({ title, children, className }) {
    return (
        <div className={['bg-white rounded-lg border border-neutral-200 shadow-sm text-neutral-600', className].filter(Boolean).join(' ')}>
            <div className="flex flex-col gap-4 px-6 py-8">
                {title && <h3 className="text-neutral-900">{title}</h3>}
                {children}
            </div>
        </div>
    );
}
