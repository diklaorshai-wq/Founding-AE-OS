import { GtmBriefExperience } from "./components/gtm-brief-experience";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 font-sans text-zinc-950">
      <main className="flex flex-1 flex-col items-center justify-start px-6 py-16 sm:px-8 sm:py-24 lg:py-32">
        <div className="flex w-full max-w-2xl flex-col items-center text-center">
          <p className="mb-8 text-sm font-medium tracking-tight text-zinc-500">
            GTM Brain
          </p>

          <h1 className="max-w-lg text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.1]">
            Generate your GTM Brief
          </h1>

          <p className="mt-5 max-w-md text-lg leading-relaxed text-pretty text-zinc-500 sm:text-xl sm:leading-relaxed">
            Know why this account, why now, why us, who to engage, and how to
            win.
          </p>

          <GtmBriefExperience />
        </div>
      </main>
    </div>
  );
}
