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

test("parsers handle markdown-bolded labels", () => {
  const formatted = `## 2. Compatibility Score
**Score**: 85/100

## 3. Archetype Classification
**Archetype**: Match

## 4. Legitimacy Assessment
**Legitimacy**: Legit

## 1. Job Title and Company
**Title**: Data Engineer Intern`;

  assert.equal(__testables.parseScore(formatted), 85);
  assert.equal(__testables.parseArchetype(formatted), "Match");
  assert.equal(__testables.parseLegitimacy(formatted), "Legit");
  assert.equal(__testables.parseJobTitle(formatted, "ignored"), "Data Engineer Intern");
});
