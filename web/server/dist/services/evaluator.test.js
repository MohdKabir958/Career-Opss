import { test } from "node:test";
import assert from "node:assert/strict";
const sample = `# Job Evaluation Report

## 1. Job Title and Company
Title: Senior Data Engineer
Company: Globex

## 2. Compatibility Score
Score: 78/100
Strong overlap with SQL, Python, and pipeline experience.

## 3. Archetype Classification
Archetype: Stretch
Requires bigger Spark footprint than current resume.

## 4. Legitimacy Assessment
Legitimacy: Legit
- Real LinkedIn page
- Listed on company website

## 5. Strengths
- 5 years SQL
- Snowflake migration

## 6. Gaps
- Spark depth (medium)

## 7. Action Plan
1. Build a Spark project this week.
`;
import { __testables } from "./evaluatorTestables.js";
test("parseScore reads NN/100", () => {
    assert.equal(__testables.parseScore(sample), 78);
});
test("parseArchetype reads label", () => {
    assert.equal(__testables.parseArchetype(sample), "Stretch");
});
test("parseLegitimacy reads value", () => {
    assert.equal(__testables.parseLegitimacy(sample), "Legit");
});
test("parseJobTitle prefers Title: line", () => {
    assert.equal(__testables.parseJobTitle(sample, "ignored"), "Senior Data Engineer");
});
