# Compliance Domain Expertise

Understanding the mining safety compliance domain is critical to the success of this application. This document outlines how the system maps real-world auditing processes to its AI implementation.

## The Hierarchy of Compliance

1. **Legislation/Acts:** Broad legal requirements set by the government (e.g., Work Health and Safety Act).
2. **Recognised Standards/Codes of Practice:** Detailed, practical guidelines that explain how to comply with the legislation.
3. **Site Procedures (ACME Procedures):** The specific, actionable steps implemented at a mine site (e.g., ACME Mining Co.) to ensure operations meet the Recognised Standards.

## Gap Analysis Logic

The core value proposition of this application is automating the Gap Analysis between **Site Procedures** and **Recognised Standards**. 

A human auditor looks for three things:
1. **Does the procedure explicitly cover the requirement?** (Full Compliance)
2. **Does the procedure touch upon the topic, but miss key specifics?** (e.g., The standard requires inspecting harnesses every 6 months; the procedure just says "inspect harnesses regularly".) (Partial Gap)
3. **Is the requirement completely ignored?** (Full Gap)

The AI prompts and chunk metadata are specifically engineered to mimic this workflow. The RAG system retrieves the standard's requirement and then searches the procedure for corresponding chunks. If the concepts do not map 1:1, a gap is flagged with a severity rating.

## Severity Ratings
- **High:** Immediate risk to life or severe legal non-compliance. (e.g., Missing lockout/tagout procedures).
- **Medium:** Operational risk or partial non-compliance. (e.g., Training frequency not specified).
- **Low:** Administrative discrepancy. (e.g., Form number referenced is outdated).
