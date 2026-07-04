# GTM Brain Product Specification (PRD)

## Product

GTM Brain is an AI-native Territory Acceleration Workspace for Enterprise Account Executives.

Operating before the CRM workflow begins, it helps Enterprise AEs ramp faster in new territories by identifying the highest-potential accounts and providing the fastest path to a meaningful first customer meeting.

Rather than replacing the existing sales stack, GTM Brain acts as an intelligence and decision layer that helps Account Executives answer one critical question before investing hours in research and outreach:

**"Does this account deserve my time right now?"**

If the answer is yes, GTM Brain provides the research, evidence, and recommended actions needed to prepare for a high-quality first customer conversation.

The initial use case is a Founding Account Executive building the Vercel Israel territory, but the architecture is designed to support any complex B2B enterprise sales motion.

---

## Problem

When Enterprise Account Executives inherit a new territory or join a new company, they face a critical cold-start problem.

Building pipeline is not simply about researching companies.

It is about deciding where to invest limited time and attention.

This challenge is driven by three fundamental problems.

### 1. Prioritizing the Right Accounts

Enterprise Account Executives do not need another search engine.

They need a faster way to determine which accounts deserve their time.

The challenge is transforming a territory into a focused, prioritized execution plan.

### 2. Insight Asymmetry

The problem is not a lack of information.

It is the gap between information and judgment.

Buying signals, engineering priorities, company strategy, hiring trends, technology choices, and organizational changes exist across dozens of disconnected sources.

Enterprise AEs spend hours collecting information instead of applying sales judgment.

### 3. The Pre-CRM Gap

Modern revenue platforms are designed to manage opportunities after pipeline already exists.

However, there is a critical gap before the CRM workflow begins.

Before creating an opportunity, an Enterprise AE must answer questions such as:

- Is this account worth pursuing?
- Why this account?
- Why now?
- What is our point of view?
- Who should we engage first?
- What is the fastest path to a meaningful first meeting?

Very few tools are designed to help Enterprise Account Executives make these decisions.

GTM Brain fills that gap by transforming fragmented information into confident GTM decisions before pipeline is created.

---

## Target User

The primary user is an Enterprise Account Executive selling complex B2B technology.

The initial user persona is a Founding Account Executive building a new territory and responsible for creating pipeline from scratch.

Typical responsibilities include:

* Building pipeline
* Researching strategic accounts
* Prioritizing target accounts
* Creating account-specific points of view
* Identifying relevant stakeholders
* Preparing first-touch outreach
* Preparing for initial discovery conversations

---

## User Story

As an Enterprise Account Executive,

I want to enter the name of a target company,

so that I can quickly understand whether the account is worth pursuing, why now may be the right time, who I should engage, and how to start the conversation.

---

## AI Design Principles

The GTM Brain is designed to be model-agnostic.

All AI capabilities should go through a centralized AI Provider layer.

The UI and business logic should never depend directly on a specific LLM provider.

This architecture allows the product to evolve, compare providers, and adopt new models over time without changing the core application.

Model selection is intentionally deferred until the GTM workflow and user experience have been validated.

---

## Input

For Sprint 1, the user enters one required input:

* Company name

---

## Output

The GTM Brain generates a structured GTM Brief containing:

* Company Summary
* ICP Fit
* Why This Company
* Why Now
* Why Us
* Pain Hypotheses
* Buying Signals
* People to Talk To
* Suggested Outreach
* Recommended Next Step

---
## User Experience

GTM Brain should not feel like an AI-generated report.

It should feel like a modern SaaS workspace similar to products like Vercel, Linear, GitHub and Stripe.

The interface should prioritize decision making over information.

Information should be organized into three clear layers:

### 1. Decision Layer

- Opportunity Score
- Priority
- Why this account
- Top Pain
- Best First Persona
- Recommended Next Action

### 2. Research Layer

- Executive Summary
- Why Now
- Why Us
- Buying Signals
- Personas
- Discovery Questions

### 3. Action Layer

Future capabilities include:

- Email Draft
- LinkedIn Message
- Call Plan
- Next Steps
## GTM Brief Experience

The first version should be a single-screen experience.

The user enters a company name and clicks Analyze.

The system returns a structured GTM Brief organized into clear sections.

The brief should help the AE answer:

* Should I spend time on this account?
* What is the strongest reason to engage?
* What signals suggest timing?
* Which personas are most relevant?
* What message should I lead with?
* What is the next best action?

---

## People to Talk To

The GTM Brain should identify the most relevant people or personas to engage first.

For Sprint 1, this can be persona-based rather than individual-name based.

Relevant personas may include:

* CTO
* VP Engineering
* VP Product
* Head of Platform
* Head of Infrastructure
* Head of AI
* CISO / Security Leader
* Developer Experience Leader
* Product Engineering Leader

For each relevant persona, the GTM Brain should identify:

* Why this persona matters
* What they likely care about
* What pain may be relevant
* What message angle may resonate
* Suggested discovery question

---

## Scope (Sprint 1)

Sprint 1 focuses on building the first working GTM Brain experience.

The product should accept a single company name and generate one complete GTM Brief.

The first implementation is optimized for Founding AE — Vercel Israel.

The objective is to demonstrate the value of AI-assisted pipeline generation, not to build a production-ready application.

Initial output may use mock data before live AI and real data sources are connected.

---

## Out of Scope (Sprint 1)

The following capabilities are intentionally postponed:

* CRM integration
* Slack integration
* Email automation
* Calendar integration
* Automated account monitoring
* Multi-agent workflows
* Territory scoring
* Pipeline forecasting
* Chrome extension
* Authentication
* Deal management
* MEDDPICC tracking

These features belong in the Parking Lot.

---

## Success Criteria

Sprint 1 is successful if an Enterprise Account Executive can use the generated GTM Brief to decide whether and how to pursue a target account.

The output should demonstrate:

* Strong account understanding
* Clear ICP reasoning
* Relevant business context
* Strong timing rationale
* Credible buying signals
* Useful pain hypotheses
* Persona-specific engagement strategy
* Actionable next step

---

## Product Principle

The GTM Brain should not simply summarize company information.

It should think like an experienced Enterprise Account Executive focused on pipeline generation.

Its purpose is to transform account research into GTM judgment and action.
---

## Future Enhancements

Features that are intentionally out of scope for the current product are tracked in:

**docs/04-parking-lot.md**

## Bulk Account Prioritization

Allow the user to upload a CSV or Excel file containing hundreds of target accounts.

GTM Brain analyzes every account and recommends where the AE should focus first.

Each account should include:

- Priority Score
- ICP Fit
- Buying Signal Strength
- Why This Company
- Why Now
- Why Us
- Recommended Buying Committee
- Suggested First Outreach
- Estimated Time to First Meeting

---

## Long-Term Product Vision

The long-term vision of GTM Brain is not simply to analyze accounts.

Its purpose is to help Enterprise Account Executives make better decisions about where to invest their time.

Rather than asking:

"Tell me about Company X."

The user should eventually be able to ask:

"Here are 500 accounts.

Which ones should I prioritize first, and why?"

Every recommendation should be transparent.

The system should explain:

- Why an account received its score.
- Which buying signals were identified.
- Which assumptions were made.
- Which information is still missing.
- Why this account ranks above others.

The goal is not AI-generated research.

The goal is AI-assisted GTM judgment.