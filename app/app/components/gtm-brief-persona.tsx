import type { GtmBriefPersona } from "../types/gtm-brief";

type GtmBriefPersonaCardProps = {
  persona: GtmBriefPersona;
};

export function GtmBriefPersonaCard({ persona }: GtmBriefPersonaCardProps) {
  const fields = [
    { label: "Why they matter", value: persona.whyTheyMatter },
    { label: "What they care about", value: persona.whatTheyCareAbout },
    { label: "Relevant pain", value: persona.relevantPain },
    { label: "Message angle", value: persona.messageAngle },
  ];

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4">
      <h4 className="text-sm font-medium text-zinc-950">{persona.title}</h4>
      <dl className="mt-3 space-y-3">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-xs font-medium text-zinc-500">{field.label}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-zinc-700">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
