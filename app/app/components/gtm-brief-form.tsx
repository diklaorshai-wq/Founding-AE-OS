"use client";

import { FormEvent } from "react";

type GtmBriefFormProps = {
  url: string;
  onUrlChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
  disabled?: boolean;
};

export function GtmBriefForm({
  url,
  onUrlChange,
  onSubmit,
  isLoading = false,
  disabled = false,
}: GtmBriefFormProps) {
  const cannotSubmit = isLoading || disabled || url.trim().length === 0;

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-xl"
      aria-label="Evaluate target company"
    >
      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white p-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:rounded-full sm:p-1.5">
        <label htmlFor="target-company-url" className="sr-only">
          Target company website
        </label>
        <input
          id="target-company-url"
          type="text"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="monday.com"
          autoComplete="url"
          inputMode="url"
          disabled={isLoading || disabled}
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base text-zinc-950 placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:py-2.5"
        />
        <button
          type="submit"
          disabled={cannotSubmit}
          className="shrink-0 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-400 sm:rounded-full sm:py-2.5"
        >
          {isLoading ? "Evaluating..." : "Ask GTM Brain"}
        </button>
      </div>
    </form>
  );
}
