# GTM Brain — Project State

**Last updated:** July 15, 2026  
**Repository:** `diklaorshai-wq/Founding-AE-OS`  
**Active branch:** `feature/why-now-framework`  
**Document status:** Current Project Orientation Layer on the active development branch.  
**Product status:** MVP intelligence foundation implemented; Company Research and Matching are next.

## 1. Product Mission

GTM Brain is the outbound decision brain of an Enterprise Account Executive.

It operates before CRM and opportunity creation.

Its primary question is:

> Does this account deserve my outbound time right now?

Its purpose is to help an Enterprise AE earn a meaningful first meeting with the right company.

GTM Brain does not manage opportunities or the full sales process.

## 2. Current MVP

The approved MVP follows one narrow end-to-end flow:

1. Vendor Profile
2. Company URL
3. AI Research
4. Company Profile
5. Matching
6. Invest / Monitor / Skip
7. Three or four short reasons
8. One Recommended First Move

The user should configure the Vendor Profile once and then enter a company URL for each evaluation.

## 3. Source-of-Truth Hierarchy

Sources must be interpreted in this order:

1. Current code on `feature/why-now-framework`
2. This Project State document
3. Current specifications consistent with the code and this document
4. Older documents and prototypes as historical context only

When sources conflict, the conflict must be reported explicitly. Older documentation must never silently override current code or approved product decisions.

## 4. Recommendation Engine V1

**Implementation status:** Implemented and stabilized.

**Active file:** `app/app/lib/intelligence/recommendationEngine.ts`

The engine evaluates three decision groups:

- Why Them
- Why Now
- Why Us

### Approved decision behavior

- A significant Why Them failure results in Skip.
- A significant Why Us failure results in Skip.
- A failed or missing Why Now results in Monitor.
- Invest is allowed only when Why Them, Why Now, and Why Us all pass.
- Every other situation results in Monitor.

### Important rules

- Do not introduce numeric account scoring.
- Confidence represents evidence completeness, not account quality.
- Missing information is not automatically negative evidence.
- Target Personas and Budget Owners are not decision gates.
- The presentation layer must remain separate from the decision logic.

The internal decision remains `Monitor`. The interface may explain it in human language as:

> Worth exploring, but there is not enough evidence to invest outbound time yet.

## 5. Recommendation Output

The current engine produces:

- Decision: Invest / Monitor / Skip
- Confidence
- Business Case
- Supporting Evidence
- Recommended Next Best Action

For the simplified MVP interface:

- Business Case and Supporting Evidence feed three or four short reasons.
- Recommended Next Best Action is presented as Recommended First Move.
- The core engine contract does not need to be renamed for this presentation change.

## 6. Vendor Profile

**Implementation status:** TypeScript structure, validation, fixture and onboarding contract implemented.

### Product Knowledge

- Offering
- Customer Problems
- Business Impact
- Desired Outcomes
- Buying Reasons
- Capabilities
- Use Cases
- Common Alternatives
- Relevant Differentiation
- Proof Points

### Decision Strategy

- Ideal Customer Profile criteria
- Ideal Customer Examples
- Firmographic Disqualifiers
- Target Personas
- Budget Owners
- Why Now Signals
- Red Flags

### Important distinctions

- Use Cases are practical situations or workflows, not customer case studies.
- Proof Points provide credibility and may include customer evidence.
- Common Alternatives are ways customers solve the problem today and are not necessarily direct competitors.
- Firmographic Disqualifiers describe company characteristics that indicate poor fit, such as company size, industry or business model. They are not financial disqualifiers.
- Firmographic Disqualifiers are not directly wired into Recommendation Engine V1. The future Matching layer may translate a verified disqualifier into a Why Them failure.
- Territory ownership is not part of the Vendor Profile.
- Ideal Customer Examples may come from outside the AE's territory.

## 7. Vendor Onboarding

**Implementation status:** Seven-stage data contract implemented. End-user UI is not yet implemented in the active product.

The approved stages are:

1. `offering`
2. `customerValue`
3. `productFit`
4. `proof`
5. `idealCustomer`
6. `people`
7. `timingAndRisk`

The onboarding should remain conversational and lightweight. The AE should feel that they are teaching GTM Brain:

- What the company sells
- Which problems it solves
- Which outcomes customers want
- Which companies are relevant
- Who usually buys
- Where the budget usually sits
- Which signals create urgency
- Which signals indicate poor fit or risk

The underlying intelligence may remain richer than the visible experience.

## 8. Company Profile

**Implementation status:** Approved product specification; not yet implemented.

After receiving a company URL, AI Research should create an internal Company Profile containing:

- Company Identity
- Company Characteristics
- Relevant Business Evidence
- Why Now Evidence
- Relevant Roles
- Red Flags
- Evidence Sources

The AE does not manually complete the Company Profile.

Each important research finding should contain:

- The claim
- The source
- The relevant date
- Its connection to the Vendor Profile
- Whether it is an explicit fact or AI interpretation

Failure to find information is not proof that the information is false.

## 9. AI Research

**Implementation status:** Approved MVP scope; not yet implemented.

AI Research may use relevant public sources, prioritizing:

- Official company website
- Product and solution pages
- Careers and public job postings
- Newsroom and company blog
- Customer and partner announcements
- Investor Relations and official reports
- Credible business and technology news
- Public professional information when relevant

The research should stop when there is enough evidence to support a reasonable decision or when it concludes that evidence is insufficient.

The MVP does not require:

- Paid data providers
- Login-protected sources
- Contact details
- Unlimited web crawling
- A document ingestion platform
- RAG or a vector database

## 10. Matching

**Implementation status:** Approved product specification; not yet implemented.

Matching compares the Vendor Profile with the Company Profile.

### Why Them

Uses ICP criteria, Ideal Customer Examples, Customer Problems, Desired Outcomes, Firmographic Disqualifiers and relevant Red Flags.

### Why Now

Uses Vendor Why Now Signals, current company events and changes, and the problems or outcomes connected to those events.

A general company event is not automatically a Why Now signal. It must be relevant to the Vendor Profile.

### Why Us

Uses Capabilities, Use Cases, Proof Points, Relevant Differentiation, current alternatives and Why Us Red Flags.

Matching produces evidence-backed gate inputs for Recommendation Engine V1. It does not replace or redesign the engine.

## 11. Relevant Roles and First Move

Target Personas and Budget Owners help GTM Brain recommend what the AE should do next.

They are not independent Invest / Monitor / Skip gates. Failure to identify a person or role must not cause Skip.

The MVP returns one Recommended First Move, such as:

- Research a relevant executive's priorities.
- Look for a specific business trigger.
- Find a potential internal champion.
- Wait for stronger evidence.
- Deprioritize the account.

## 12. Automated Tests

**Implementation status:** Implemented.

The current Intelligence foundation contains 11 executed tests:

- Six Recommendation Engine scenarios
- Three Vendor Profile validation tests
- Two Vendor Onboarding tests

These tests protect the currently implemented core behaviors. They do not represent complete coverage of future Company Research, Company Profile, Matching or the end-to-end MVP flow.

## 13. Existing Design Work

A conversational Vendor Onboarding prototype was created in v0.

It remains a design reference. Its code must not be copied directly into the product without review. The active product architecture and decision logic must be preserved.

## 14. Outside the Current MVP

- CRM integration
- Opportunity management
- Territory management
- Account list management
- Outreach automation
- Email generation
- Contact enrichment
- Automated monitoring and refresh
- Numeric account scoring
- Advanced evidence weighting
- Model benchmarking
- RAG or vector databases
- Authentication and multi-user administration
- Complex dashboards

Valuable future ideas should remain in the Parking Lot.

## 15. Current Risks and Documentation Issues

Some older documents contain outdated sprint labels, incomplete criteria or earlier product thinking.

Known examples include:

- Conflicting sprint numbers
- README references that may not reflect current file status
- `To be defined` sections in the older Company Evaluation Framework
- Earlier ideas that must not override Recommendation Engine V1

Documentation cleanup should not become a large MVP project. This Project State document provides the current orientation layer.

## 16. Current Position

### Completed

- Product mission
- Recommendation Engine V1
- Decision behavior
- Six engine scenarios
- Vendor Profile TypeScript structure
- Vendor Profile validation
- Vendor Profile test fixture
- Seven-stage Vendor Onboarding contract
- Persona and Budget Owner structure
- Eleven targeted automated tests
- MVP scope definition
- Company Profile product specification
- AI Research boundaries
- Matching product specification

### Not yet completed

- Vendor Onboarding user interface
- Company URL input
- AI Research implementation
- Company Profile TypeScript representation
- Matching implementation
- End-to-end recommendation flow
- Simplified result screen

## 17. Proposed Development Sequence

**Status:** Proposed, not yet approved for implementation.

1. Define the Company Profile TypeScript contract.
2. Define the evidence and source structure.
3. Define the Matching output contract consumed by Recommendation Engine V1.
4. Add automated fixtures and tests.
5. Implement the smallest URL-to-Company-Profile research path.
6. Connect Matching to Recommendation Engine V1.
7. Build the simplified result experience.
8. Build or connect the Vendor Onboarding UI.

No implementation may begin without explicit approval of the exact change, affected files, preserved behavior and test plan.

## 18. Working Rules

- Preserve existing approved work.
- Do not redesign Recommendation Engine V1 unless explicitly requested and approved.
- Do not introduce numeric account scoring.
- Do not treat missing evidence as negative evidence.
- Do not allow Personas or Budget Owners to become decision gates.
- Work on one bounded task at a time.
- Before any code or GitHub mutation, explain the exact scope and obtain explicit user approval.
