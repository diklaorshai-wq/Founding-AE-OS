type GtmBriefBulletListProps = {
  items: string[];
};

export function GtmBriefBulletList({ items }: GtmBriefBulletListProps) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span
            aria-hidden="true"
            className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-400"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
