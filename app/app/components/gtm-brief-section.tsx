type GtmBriefSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function GtmBriefSection({ title, children }: GtmBriefSectionProps) {
  return (
    <section className="px-5 py-5 sm:px-6 sm:py-6">
      <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {title}
      </h3>
      <div className="mt-3 text-left text-sm leading-relaxed text-zinc-700 sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}
