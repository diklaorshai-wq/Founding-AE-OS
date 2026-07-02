type GtmBriefDecisionCardProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function GtmBriefDecisionCard({
  title,
  children,
  className = "",
}: GtmBriefDecisionCardProps) {
  return (
    <div
      className={`rounded-xl border border-zinc-200/80 bg-white p-4 sm:p-5 ${className}`}
    >
      <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {title}
      </h3>
      <div className="mt-3 text-sm leading-relaxed text-zinc-700 sm:text-[15px]">
        {children}
      </div>
    </div>
  );
}
