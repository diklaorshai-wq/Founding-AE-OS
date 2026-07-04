type GtmBriefWorkspacePanelProps = {
  children: React.ReactNode;
};

export function GtmBriefWorkspacePanel({ children }: GtmBriefWorkspacePanelProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {children}
    </div>
  );
}
