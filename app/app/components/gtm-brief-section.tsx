type GtmBriefSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function GtmBriefSection({ title, children }: GtmBriefSectionProps) {
  return (
    <section className="border-t border-zinc-200/80 px-6 py-6 first:border-t-0 first:pt-0 sm:px-8">
      <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {title}
      </h3>
      <div className="mt-3 text-left text-sm leading-relaxed text-zinc-700 sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}
