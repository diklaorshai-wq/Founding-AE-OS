"use client";

import { FormEvent } from "react";

type GtmBriefFormProps = {
  company: string;
  onCompanyChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
};

export function GtmBriefForm({
  company,
  onCompanyChange,
  onSubmit,
  isLoading = false,
}: GtmBriefFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-xl"
      aria-label="Ask GTM Brain"
    >
      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white p-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:rounded-full sm:p-1.5">
        <label htmlFor="company-name" className="sr-only">
          Company name
        </label>
        <input
          id="company-name"
          type="text"
          value={company}
          onChange={(event) => onCompanyChange(event.target.value)}
          placeholder="Enter company name..."
          autoComplete="organization"
          disabled={isLoading}
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base text-zinc-950 placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:py-2.5"
        />
        <button
          type="submit"
          disabled={isLoading || company.trim().length === 0}
          className="shrink-0 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-400 sm:rounded-full sm:py-2.5"
        >
          {isLoading ? "Thinking..." : "Ask GTM Brain"}
        </button>
      </div>
    </form>
  );
}
