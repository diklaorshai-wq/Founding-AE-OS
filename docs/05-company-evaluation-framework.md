# Company Evaluation Framework

## Purpose

The Enterprise Decision Framework (EDF) defines how GTM Brain determines whether an account deserves an Enterprise Account Executive's outbound time.

The EDF is the core reasoning model behind the GTM Intelligence Engine.

Its purpose is not to qualify opportunities.

Its purpose is to prioritize accounts before an opportunity exists.

The framework helps Enterprise Account Executives answer one question:

> If you had one outbound hour available today, would this account deserve it?

Every recommendation is designed to help an Enterprise AE decide whether an account is worth researching, prospecting, and pursuing for a meaningful first customer conversation.

The output of every evaluation is:

- Recommendation (Invest / Monitor / Skip)
- Executive Decision Narrative
  - Why Them
  - Why Now
  - Why Us
- Business Case
- Supporting Evidence
- Confidence
- Recommended Next Best Action

This document defines the decision framework only.

It does not define product-specific knowledge, AI implementation, or data sources.

---

# Design Principles

The framework is based on four core principles.

## 1. Evidence-Based Decisions

GTM Brain does not score companies based on arbitrary signals.

Every recommendation must be supported by evidence.

---

## Universal Architecture

The Enterprise Decision Framework (EDF) is universal.

It does not contain customer-specific business logic.

Every account evaluation is based on the interaction between three independent layers.

```text
Company Attributes
        +
Decision Strategy
        ↓
Enterprise Decision Framework
        ↓
Account Evaluation
```

### Company Attributes

Describe observable facts about the company being evaluated.

### Decision Strategy

Defines how a specific company prioritizes and evaluates accounts.

### Enterprise Decision Framework

Applies universal enterprise sales reasoning to produce an account evaluation.

---

## 2. Product-Aware Evaluation

Companies are never evaluated in isolation.

Every evaluation is performed relative to a specific product.

The same company may be an excellent account for one product and a poor account for another.

---

## 3. Explainable Recommendations

Every recommendation should be understandable by the Account Executive.

The user should always know why GTM Brain recommends Invest, Monitor or Skip.

---

## 4. Separation of Knowledge

The Evaluation Framework defines **how** GTM Brain thinks.

The Product Knowledge layer defines **what** GTM Brain knows about a specific product.

The Intelligence Engine combines the Evaluation Framework with Product Knowledge to produce recommendations.

This separation allows the same decision engine to evaluate different enterprise products.

---

# Core Evaluation Hypothesis

An account deserves an Enterprise Account Executive's time when there is sufficient evidence that:

- the company is worth pursuing,
- the timing is favorable,
- and the product is well positioned to create meaningful business value.

---

# Evaluation Framework

GTM Brain evaluates every company through three decision gates.

Each gate answers one fundamental sales question.

Each gate consists of multiple evaluation criteria.

Each criterion is evaluated independently.

The gate then produces one decision:

- Pass
- Unknown
- Fail

The GTM Intelligence Engine combines the results of all three gates to produce the final recommendation.

# Enterprise Decision Process

## Inputs

- Company Attributes
- Decision Strategy

---

## Reasoning

- Account Fit
- Why Now
- Buying Readiness
- Strategic Value
- Evidence Quality

---

## Executive Decision Narrative

- Why Them
- Why Now
- Why Us

---

## Account Evaluation

- Recommendation
- Investment Score
- Confidence
- Supporting Evidence
- Risks
- Missing Information
- Next Best Action

---

# Gate 1 — Why Them?

Determines whether this company is fundamentally worth pursuing for this product.

The Why Them gate evaluates three independent criteria.

---

## Criterion 1 — Strategic Initiative

### Definition

Strategic Initiative measures whether the company is actively investing in a business or technology initiative that the product can materially improve.

### Evaluation Question

Is the company currently investing in a strategically important business or technology initiative that the product can materially improve?

### Why It Matters

Enterprise organizations rarely purchase software because of isolated operational problems.

They invest when software enables an important business or technology initiative.

Without a relevant initiative, an enterprise buying process is unlikely to begin.

### Decision Logic

The Strategic Initiative criterion returns one of three outcomes:

- **Pass** — Strong evidence confirms the existence of a relevant strategic initiative.
- **Unknown** — There is insufficient evidence to determine whether a relevant initiative exists.
- **Fail** — Available evidence indicates that no relevant initiative exists.

### Evidence

To be defined.

### Product Dependency

Strategic Initiatives are product-specific.

The Evaluation Framework defines how they are evaluated.

The Product Knowledge layer defines which initiatives are relevant for a specific product.

---

## Criterion 2 — Strategic Fit

### Definition

Strategic Fit measures whether the product directly enables one or more of the company's strategic business or technology objectives.

### Evaluation Question

Does the product directly support one or more of the company's strategic objectives?

### Why It Matters

Enterprise organizations invest in business outcomes, not technology for its own sake.

A strong Strategic Fit exists when the product directly advances one or more executive priorities.

### Decision Logic

The Strategic Fit criterion returns one of three outcomes:

- **Pass** — The product clearly supports one or more strategic objectives.
- **Unknown** — There is insufficient evidence to determine strategic alignment.
- **Fail** — The product does not meaningfully support the company's strategic objectives.

### Evidence

To be defined.

---

## Criterion 3 — Business Impact

### Definition

Business Impact measures the magnitude of business value the product can create if successfully adopted.

### Evaluation Question

Would successful adoption of this product create meaningful business value for this company?

### Why It Matters

Enterprise buying decisions require meaningful business justification.

Even when Strategic Initiative and Strategic Fit are strong, the expected business impact must justify executive attention, organizational change, and budget allocation.

### Decision Logic

The Business Impact criterion returns one of three outcomes:

- **Pass** — The expected business value is significant.
- **Unknown** — There is insufficient evidence to estimate business value.
- **Fail** — The expected business value is too limited to justify an enterprise buying process.

### Evidence

To be defined.

---

## Gate Decision

The Why Them gate combines the evaluation of:

- Strategic Initiative
- Strategic Fit
- Business Impact

The gate returns one of three outcomes:

- **Pass**
- **Unknown**
- **Fail**

---

# Gate 2 — Why Now?

Determines whether there is credible evidence that the company has a compelling reason to act within the current planning horizon.

A company may be an excellent long-term fit for the product, but without urgency there is little reason to prioritize it over other accounts.

Why Now determines whether the timing is favorable for an enterprise sales motion.

---

## Why It Matters

Enterprise organizations rarely change strategic technology without a compelling reason to do so.

Urgency is typically created by business events, technology changes, organizational shifts, competitive pressure, or external deadlines.

Companies with strong urgency deserve earlier attention because they are more likely to invest, evaluate new solutions, and execute change.

---

## Evaluation Question

Is there credible evidence that this company has a meaningful reason to act now rather than later?

---

## Decision Logic

The Why Now gate has three possible outcomes:

- **Pass** — Strong evidence indicates that meaningful urgency exists.

- **Unknown** — There is insufficient evidence to determine whether meaningful urgency exists.

- **Fail** — Available evidence indicates that there is no meaningful urgency at this time.

### Business Trigger

#### Definition

Business Trigger measures whether a recent or upcoming event creates urgency for the company to evaluate new solutions.

#### Evaluation Question

Has a meaningful business event occurred—or is one expected—that increases the likelihood of a buying process?

#### Why It Matters

Enterprise organizations often accelerate purchasing decisions in response to significant business events rather than routine planning cycles.

#### Decision Logic

- **Pass** – Strong evidence of a meaningful business trigger.
- **Unknown** – Insufficient evidence.
- **Fail** – No meaningful business trigger identified.

#### Evidence

To be defined.

### Leadership Change

#### Definition

Leadership Change measures whether recent executive or organizational changes increase the likelihood of strategic technology decisions.

#### Evaluation Question

Has the company experienced a meaningful leadership or organizational change that could create momentum for evaluating new solutions?

#### Why It Matters

New executives often bring new priorities, budgets, and a mandate to drive change.

Leadership transitions frequently create opportunities to introduce new technologies and challenge existing approaches.

#### Decision Logic

- **Pass** – Recent leadership changes are likely to influence strategic technology decisions.
- **Unknown** – Insufficient evidence.
- **Fail** – No meaningful leadership changes identified.

#### Evidence

To be defined.

### Technology Inflection Point

#### Definition

Technology Inflection Point measures whether the company is undergoing a significant technology transition that increases the likelihood of evaluating new platforms or vendors.

#### Evaluation Question

Is the company currently experiencing a meaningful technology transition that could justify evaluating new solutions?

#### Why It Matters

Major technology transitions often force organizations to reconsider existing architectures, vendors, and operating models.

These periods create natural opportunities for enterprise software purchases.

#### Decision Logic

- **Pass** – Strong evidence of a significant technology transition.
- **Unknown** – Insufficient evidence.
- **Fail** – No meaningful technology transition identified.

#### Evidence

To be defined.

### Cost of Inaction

#### Definition

Cost of Inaction measures whether delaying action is likely to create meaningful business, operational, financial, or competitive consequences for the company.

#### Evaluation Question

Would postponing action create meaningful negative consequences for the company?

#### Why It Matters

Enterprise organizations are more likely to prioritize initiatives when maintaining the status quo becomes increasingly costly.

The greater the cost of delaying change, the stronger the urgency to begin an enterprise buying process.

#### Decision Logic

- **Pass** – Strong evidence indicates that delaying action has meaningful consequences.
- **Unknown** – Insufficient evidence.
- **Fail** – Little or no evidence that delaying action creates meaningful consequences.

#### Evidence

To be defined.

---

# Gate 3 — Why Us?

Determines whether this product is uniquely positioned to solve the company's problem better than the available alternatives.

A company may be an excellent fit and have strong urgency, but if our product is not well positioned to win, it should not become a priority.

---

## Why It Matters

Enterprise organizations rarely buy the objectively "best" product.

They buy the product that creates the greatest value relative to their current situation and available alternatives.

Understanding why we are positioned to win is essential before investing significant sales effort.

---

## Evaluation Question

Is there credible evidence that this product has a meaningful advantage for this company's situation?

---

## Decision Logic

The Why Us gate has three possible outcomes:

- **Pass** — Strong evidence indicates that our product is well positioned to win.
- **Unknown** — There is insufficient evidence to determine our competitive position.
- **Fail** — Available evidence indicates that our product is unlikely to be the preferred solution.

### Product Differentiation

#### Definition

Product Differentiation measures whether the product provides meaningful advantages over available alternatives for this specific company.

#### Evaluation Question

Does the product offer capabilities that are meaningfully better aligned with this company's needs than the available alternatives?

#### Why It Matters

Enterprise software is rarely purchased because it is generally superior.

It is purchased because it is uniquely suited to solve the customer's specific problem.

#### Decision Logic

- **Pass** – Clear competitive differentiation exists.
- **Unknown** – Insufficient evidence.
- **Fail** – No meaningful differentiation identified.

#### Evidence

To be defined.

### Technical Alignment

#### Definition

Technical Alignment measures whether the company's existing technology stack and architecture are compatible with successful adoption of the product.

#### Evaluation Question

Is the company's technical environment well aligned with the product?

#### Why It Matters

Even the best product is unlikely to succeed if it requires fundamental architectural changes or conflicts with the company's technology strategy.

#### Decision Logic

- **Pass** – Strong technical alignment exists.
- **Unknown** – Insufficient evidence.
- **Fail** – Significant technical misalignment exists.

#### Evidence

To be defined.

### Adoption Friction

#### Definition

Adoption Friction measures how difficult it would be for the company to successfully adopt the product.

#### Evaluation Question

Are there significant organizational, technical, or commercial barriers that make adoption difficult?

#### Why It Matters

Strong products can still lose when the effort required to adopt them outweighs the expected value.

#### Decision Logic

- **Pass** – Low adoption friction.
- **Unknown** – Insufficient evidence.
- **Fail** – High adoption friction.

#### Evidence

To be defined.

### Competitive Position

#### Definition

Competitive Position measures whether the product has a meaningful advantage over the company's current approach and available alternatives.

#### Evaluation Question

Is there credible evidence that this product is better positioned than the available alternatives?

#### Why It Matters

Enterprise buyers compare options before making strategic technology investments.

Understanding the company's competitive landscape is essential to estimating the likelihood of winning.

#### Decision Logic

- **Pass** – Strong competitive position.
- **Unknown** – Insufficient evidence.
- **Fail** – Weak competitive position.

#### Evidence

To be defined.
---

## Future Automation

Future automation platforms (such as Make) may execute research workflows, collect evidence, or synchronize external systems.

However, automation must never change the evaluation logic defined in this framework.

The Company Evaluation Framework remains the single source of truth for business decisions.

---

# Document Status

Status: Approved

Version: 1.0

Sprint: Company Evaluation Framework V1

Last Updated: July 2026

Next Sprint: Build Recommendation Engine