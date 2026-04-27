import { test } from "node:test";
import assert from "node:assert/strict";
import { __scanTestables } from "./scanRunnerTestables.js";

test("parses markdown table rows from pipeline.md", () => {
  const md = `# Pipeline\n\n## Pendientes\n\n| Company | Title | URL | Location | Source |\n| --- | --- | --- | --- | --- |\n| Acme | Senior Engineer | https://acme.com/jobs/1 | Remote | LinkedIn |\n| Globex | Lead Data Engineer | https://globex.io/careers/2 | NYC | Indeed |\n`;
  const rows = __scanTestables.parseRowsFromMarkdown(md);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].company, "Acme");
  assert.equal(rows[0].title, "Senior Engineer");
  assert.equal(rows[0].url, "https://acme.com/jobs/1");
  assert.equal(rows[1].source, "Indeed");
});

test("parses URL fragments from stdout", () => {
  const stdout = `Found new offer: Initech - Backend Engineer https://initech.example.com/job/42 \nIgnored line\nGlobex | Data Engineer https://globex.io/jobs/99\n`;
  const rows = __scanTestables.parseRowsFromStdout(stdout);
  assert.equal(rows.length, 2);
  assert.match(rows[0].url, /initech/);
  assert.equal(rows[1].company, "Globex");
});
