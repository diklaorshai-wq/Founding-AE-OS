# Recommendation Engine (V1)

## Purpose

The Recommendation Engine converts the results of the Company Evaluation Framework into a clear recommendation for the Enterprise Account Executive.

It is a component of the GTM Intelligence Engine.

## Version 1

Version 1 uses a rule-based recommendation model.

The Recommendation Engine evaluates the outcomes of the three decision gates:

- Why Them
- Why Now
- Why Us

and produces:

- Invest
- Monitor
- Skip

along with:

- Business Case
- Supporting Evidence
- Confidence
- Recommended Next Best Action

---

## Recommendation Engine Principles

The Recommendation Engine is responsible for making the final recommendation.

Large Language Models (LLMs) are used to collect, summarize, and structure evidence from company data, but they do not make investment decisions.

The recommendation is always produced by the GTM Brain Recommendation Engine using the Company Evaluation Framework.

This separation ensures:

- Explainable recommendations
- Consistent decision logic
- Deterministic behavior
- Easy testing
- Model independence
- Enterprise-grade trust

Recommendation flow:

Raw Company Data
↓
AI Evidence Extraction
(Vercel AI SDK)
↓
Structured Evaluation
(Why Them / Why Now / Why Us)
↓
Recommendation Engine
(TypeScript)
↓
Invest / Monitor / Skip

---


## Design Principle

The Recommendation Engine does not collect evidence.

It does not understand products.

It does not perform research.

Its only responsibility is translating evaluation results into a recommendation.

## Future Evolution

Future versions may replace rule-based recommendations with evidence-weighted judgment.

Decision logic should evolve without changing the surrounding architecture.

Automation platforms (such as Make) may trigger evaluations or distribute recommendations, but they must never modify the recommendation logic itself.