import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { parseApplicationsFile } from "./applicationsParser.js";
test("parseApplicationsFile parses markdown table rows", () => {
    const tmp = path.join(process.cwd(), ".tmp-applications-test.md");
    writeFileSync(tmp, [
        "| ID | Date | Company | Role | Score | Status | Applied | Report |",
        "|---|---|---|---|---|---|---|---|",
        "| 001 | 2026-01-01 | Acme | Data Engineer | 4.2 | Evaluada | ❌ | [001](reports/001.md) |",
    ].join("\n"));
    try {
        const rows = parseApplicationsFile(tmp);
        assert.equal(rows.length, 1);
        assert.equal(rows[0]?.company, "Acme");
        assert.equal(rows[0]?.status, "Evaluada");
    }
    finally {
        unlinkSync(tmp);
    }
});
