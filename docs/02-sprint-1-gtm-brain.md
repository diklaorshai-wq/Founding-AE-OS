# Sprint 1 — GTM Brain v0.1

## Sprint Goal

Build the first working version of GTM Brain that generates a complete GTM Workspace from a single company name.

The user enters a company name and receives a workspace that helps determine whether the account deserves investment.

---

## User Story

As an Enterprise Account Executive,

I want to enter the name of a target company,

so that I immediately understand whether I should invest time pursuing the account.

---

## MVP

Input

* Company Name

Output

A GTM Workspace containing:

- Decision Layer
- Research Layer
- Action Layer

The workspace includes:

- Executive Summary
- ICP Fit
- Why This Company
- Why Now
- Why Us
- Pain Hypotheses
- Buying Signals
- People to Talk To
- Suggested Outreach
- Recommended Next Step

The GTM Brief represents the core intelligence presented within the GTM Workspace.

---

## Version 0.1

This version focuses on account evaluation before pipeline creation.

Scope limitations:

- No CRM integration
- No external integrations
- No automation workflows
- No multi-agent orchestration

The objective is to validate the core intelligence and deliver it through a simple workspace.

---

## Technical Goal

Build the frontend using Next.js.

Initially use mock data.

Design the Intelligence Engine independently from the UI.

Real AI, external data sources, and automation will be connected in later versions.

---

## Success Criteria

A user can:

1. Enter a company name.
2. Click Analyze.
3. Receive a complete GTM Workspace.
4. Feel that the output is immediately useful for prospecting.
5. Understand why the account is or is not worth pursuing.

---

## Current Status

✅ Product vision completed

✅ Workspace design completed

✅ Core documentation completed

🚧 Intelligence Engine design in progress

⬜ Implement Decision Framework

⬜ Connect AI

⬜ Connect external data


## Architecture Principles

- Intelligence is independent from presentation.
- The GTM Workspace displays decisions; it does not generate them.
- Automation is intentionally out of scope for Version 0.1.
- The architecture should support future integrations through an Automation Layer (e.g. Make) without changing the Intelligence Engine.