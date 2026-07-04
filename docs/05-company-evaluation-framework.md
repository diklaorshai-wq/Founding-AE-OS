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

The framework is based on several core principles.

### 1. Evidence-Based Decisions

GTM Brain does not score companies based on arbitrary signals.

It collects evidence and builds a business case.

---

### 2. Product-Aware Evaluation

Companies are never evaluated in isolation.

Every evaluation is performed relative to a specific product.

The same company may be an excellent account for one product and a poor account for another.

---

### 3. Explainable Recommendations

Every recommendation must be supported by evidence.

The user should always understand why GTM Brain recommends Invest, Monitor or Skip.

---

### 4. Product Knowledge is Separate

This framework defines **how** GTM Brain evaluates accounts.

Product-specific knowledge (ICP, pains, initiatives, buying signals, anti-patterns, etc.) is maintained separately.

This separation allows the same evaluation engine to work across different enterprise products.

---

# Core Evaluation Hypothesis

An account deserves an Enterprise AE's time when there is strong evidence that the company has a strategically important business or technology initiative that the product is uniquely positioned to improve.

---

# Evaluation Framework

GTM Brain evaluates every account by answering three fundamental questions.

These questions mirror the reasoning process of an experienced Enterprise Account Executive.

## 1. Why Them?

Does this company have a strategically important business or technology initiative that makes it a strong fit for this product?

### Strategic Initiative

#### Type

Gate

#### Evaluation Question

Is the company currently investing in a strategically important business or technology initiative that the product can materially improve?

#### Why It Matters

Enterprise organizations rarely purchase software because of small operational problems.

They invest when software supports an important strategic initiative or business-critical transformation.

Without such an initiative, an enterprise sales cycle is unlikely to justify the investment.

#### Product Dependency

The definition of a Strategic Initiative is product-specific.

Each product defines its own initiatives through the Product Knowledge layer.

#### Evidence

To be defined.

#### Decision Logic

If GTM Brain cannot find meaningful evidence of a relevant strategic initiative, the default recommendation is **Skip**.
