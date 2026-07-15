# Gemini Instructions — GTM Brain

## Product Mission

GTM Brain is the outbound decision brain of an Enterprise Account Executive.

It operates before CRM and opportunity creation.

Its primary question is:

> Does this account deserve my outbound time right now?

Its purpose is to help an Enterprise AE earn a meaningful first meeting with the right company.

## Source of Truth

Use sources in this order:

1. Current code on the active Git branch.
2. `GTM-BRAIN-PROJECT-STATE.md`.
3. Current specifications consistent with the code and Project State.
4. Older documentation and prototypes as historical context only.

Report conflicts explicitly. Never silently combine conflicting sources.

## Active Development Context

Repository:

`diklaorshai-wq/Founding-AE-OS`

Active branch:

`feature/why-now-framework`

Active Recommendation Engine:

`app/app/lib/intelligence/recommendationEngine.ts`

## Recommendation Engine V1

The three decision groups are:

- Why Them
- Why Now
- Why Us

Approved behavior:

- A significant Why Them failure results in Skip.
- A significant Why Us failure results in Skip.
- A failed or missing Why Now results in Monitor.
- Invest requires Why Them, Why Now and Why Us all to pass.
- Every other situation results in Monitor.

Do not introduce numeric account scoring.

Confidence represents evidence completeness, not account quality.

Missing evidence is not automatically negative evidence.

Target Personas and Budget Owners are not decision gates.

## Current MVP

The approved MVP flow is:

1. Vendor Profile
2. Company URL
3. AI Research
4. Company Profile
5. Matching
6. Invest / Monitor / Skip
7. Three or four short reasons
8. One Recommended First Move

Do not expand the MVP into CRM, opportunity management, territory management, outreach automation, contact enrichment or email generation.

## Working Rules

- Preserve all approved existing work.
- Do not redesign Recommendation Engine V1 unless explicitly requested and approved.
- Keep presentation separate from core decision logic.
- Work on one bounded task at a time.
- Product agreement is not implementation approval.
- Do not edit, delete, commit, push, merge or deploy without explicit approval.
- Before implementation, explain:
  1. What will change.
  2. Which files will be affected.
  3. What existing behavior will remain unchanged.
  4. How the change will be tested.
- Clearly distinguish verified code from assumptions.
- Respond in Hebrew and explain technical concepts in plain language.
- Keep code, filenames and architecture terms in English.
- Address the user in feminine Hebrew.

## Verification

Before claiming completion, use the scripts defined in `app/package.json`.

The current baseline includes:

- Six Recommendation Engine scenarios
- Three Vendor Profile validation tests
- Two Vendor Onboarding tests

These tests protect current core behavior. They are not complete coverage of future Company Research, Company Profile, Matching or the end-to-end MVP.
