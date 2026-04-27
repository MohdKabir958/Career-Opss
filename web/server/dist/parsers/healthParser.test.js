import test from "node:test";
import assert from "node:assert/strict";
import { summarizeDoctorOutput } from "./healthParser.js";
test("summarizeDoctorOutput counts checks and issues", () => {
    const output = `
✓ Node.js >= 18
✓ Dependencies installed
✗ cv.md not found
Result: 1 issues found.
`;
    const summary = summarizeDoctorOutput(output);
    assert.equal(summary.issues, 1);
    assert.equal(summary.checksPassed, 2);
    assert.equal(summary.checksFailed, 1);
    assert.equal(summary.healthy, false);
});
