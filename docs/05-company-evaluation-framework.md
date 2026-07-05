# Company Evaluation Framework

## Purpose

The Company Evaluation Framework defines how GTM Brain determines whether a single company deserves an Enterprise Account Executive's time.

The framework evaluates one company for one product.

Its goal is to answer one question:

> Does this account deserve my time right now?

The output of every evaluation is:

- Decision (Invest / Monitor / Skip)
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

This separation allows the same decision engine to evaluate different enterprise products.

---

# Core Evaluation Hypothesis

An account deserves an Enterprise Account Executive's time when there is sufficient evidence that:

- the company is worth pursuing,
- the timing is favorable,
- and the product is uniquely positioned to create meaningful business value.

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

The final recommendation combines the results of all three gates.

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

Determines whether the timing is favorable to begin an enterprise buying process.

Evaluation criteria will be defined in a future sprint.

---

# Gate 3 — Why Us?

Determines whether this product is uniquely positioned to solve the company's problem.

Evaluation criteria will be defined in a future sprint.