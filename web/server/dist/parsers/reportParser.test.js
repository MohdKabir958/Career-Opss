import test from "node:test";
import assert from "node:assert/strict";
import { parseReport } from "./reportParser.js";
test("parseReport extracts metadata", () => {
    const sample = `# Evaluation: Acme — Junior Data Engineer

**Date:** 2026-04-25
**Archetype:** Data Engineering
**Score:** 3.8/5
**Legitimacy:** Proceed with Caution
`;
    const parsed = parseReport("reports/001-acme-2026-04-25.md", sample);
    assert.equal(parsed.company, "Acme");
    assert.equal(parsed.role, "Junior Data Engineer");
    assert.equal(parsed.score, "3.8");
});
