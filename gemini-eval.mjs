#!/usr/bin/env node
/**
 * gemini-eval.mjs — AI-powered Job Offer Evaluator for career-ops
 *
 * Evaluates JDs using Gemini or OpenAI models.
 * Reads evaluation logic from modes/oferta.md + modes/_shared.md,
 * reads the user's resume from cv.md, and evaluates a Job Description
 * passed as a command-line argument.
 *
 * Usage:
 *   node gemini-eval.mjs "Paste full JD text here"
 *   node gemini-eval.mjs --file ./jds/my-job.txt
 *
 * Requires one of:
 *   GEMINI_API_KEY in .env (or environment variable)
 *   OPENAI_API_KEY in .env (or environment variable)
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Bootstrap: load .env before anything else
// ---------------------------------------------------------------------------
try {
  const { config } = await import('dotenv');
  config();
} catch {
  // dotenv is optional — fall back to process.env if not installed
}

import { GoogleGenerativeAI } from '@google/generative-ai';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const ROOT = dirname(fileURLToPath(import.meta.url));

const PATHS = {
  // Primary evaluation logic lives in these two mode files
  shared:   join(ROOT, 'modes', '_shared.md'),
  oferta:   join(ROOT, 'modes', 'oferta.md'),
  // Canonical skill path referenced in Issue #344
  evaluate: join(ROOT, '.claude', 'skills', 'career-ops', 'SKILL.md'),
  cv:       join(ROOT, 'cv.md'),
  reports:  join(ROOT, 'reports'),
  tracker:  join(ROOT, 'data', 'applications.md'),
};

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              career-ops — AI Evaluator (CLI script)             ║
╚══════════════════════════════════════════════════════════════════╝

  Evaluate a job offer using Gemini or OpenAI.

  USAGE
    node gemini-eval.mjs "<JD text>"
    node gemini-eval.mjs --file ./jds/my-job.txt
    node gemini-eval.mjs --provider gemini --model gemini-2.0-flash "<JD text>"
    node gemini-eval.mjs --provider openai --model gpt-4o-mini "<JD text>"

  OPTIONS
    --file <path>    Read JD from a file instead of inline text
    --provider <p>   gemini | openai | auto (default: auto)
    --model <name>   Model name (provider-specific default if omitted)
    --no-save        Do not save report to reports/ directory
    --help           Show this help

  SETUP
    1. Add one of these keys to .env:
       GEMINI_API_KEY=<your-key>
       OPENAI_API_KEY=<your-key>
    3. Run: npm install   (installs @google/generative-ai + dotenv)

  EXAMPLES
    node gemini-eval.mjs "We are looking for a Senior AI Engineer..."
    node gemini-eval.mjs --file ./jds/openai-swe.txt
`);
  process.exit(0);
}

// Parse flags
let jdText = '';
let provider = (process.env.AI_PROVIDER || 'auto').toLowerCase();
let modelName = '';
let saveReport = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && args[i + 1]) {
    const filePath = args[++i];
    if (!existsSync(filePath)) {
      console.error(`❌  File not found: ${filePath}`);
      process.exit(1);
    }
    jdText = readFileSync(filePath, 'utf-8').trim();
  } else if (args[i] === '--model' && args[i + 1]) {
    modelName = args[++i];
  } else if (args[i] === '--provider' && args[i + 1]) {
    provider = args[++i].toLowerCase();
  } else if (args[i] === '--no-save') {
    saveReport = false;
  } else if (!args[i].startsWith('--')) {
    jdText += (jdText ? '\n' : '') + args[i];
  }
}

if (!jdText) {
  console.error('❌  No Job Description provided. Run with --help for usage.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Validate environment
// ---------------------------------------------------------------------------
const geminiApiKey = process.env.GEMINI_API_KEY;
const openAiApiKey = process.env.OPENAI_API_KEY;

if (!['auto', 'gemini', 'openai'].includes(provider)) {
  console.error(`❌  Invalid provider: ${provider}. Use gemini, openai, or auto.`);
  process.exit(1);
}

if (provider === 'auto') {
  if (openAiApiKey) {
    provider = 'openai';
  } else if (geminiApiKey) {
    provider = 'gemini';
  }
}

if (provider === 'gemini' && !modelName) {
  modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
}
if (provider === 'openai' && !modelName) {
  modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

if (!provider || (provider === 'gemini' && !geminiApiKey) || (provider === 'openai' && !openAiApiKey)) {
  console.error(`
❌  API key not found for selected provider.

   Add one of these to .env:
   - GEMINI_API_KEY=your_key_here
   - OPENAI_API_KEY=your_key_here

   Optional:
   - AI_PROVIDER=openai|gemini
   - OPENAI_MODEL=gpt-4o-mini
   - GEMINI_MODEL=gemini-2.0-flash
`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------
function readFile(path, label) {
  if (!existsSync(path)) {
    console.warn(`⚠️   ${label} not found at: ${path}`);
    return `[${label} not found — skipping]`;
  }
  return readFileSync(path, 'utf-8').trim();
}

function nextReportNumber() {
  if (!existsSync(PATHS.reports)) return '001';
  const files = readdirSync(PATHS.reports)
    .filter(f => /^\d{3}-/.test(f))
    .map(f => parseInt(f.slice(0, 3)))
    .filter(n => !isNaN(n));
  if (files.length === 0) return '001';
  return String(Math.max(...files) + 1).padStart(3, '0');
}

// Lazy import — only used when saving
let readdirSync;
try {
  ({ readdirSync } = await import('fs'));
} catch { /* already imported above via named exports */ }
// Use named import fallback
if (!readdirSync) {
  readdirSync = (await import('fs')).readdirSync;
}

// ---------------------------------------------------------------------------
// Load context files
// ---------------------------------------------------------------------------
console.log('\n📂  Loading context files...');

const sharedContext  = readFile(PATHS.shared,   'modes/_shared.md');
const ofertaLogic    = readFile(PATHS.oferta,   'modes/oferta.md');
const cvContent      = readFile(PATHS.cv,       'cv.md');

// ---------------------------------------------------------------------------
// Build the system prompt (mirrors the Claude skill router logic)
// ---------------------------------------------------------------------------
const systemPrompt = `You are career-ops, an AI-powered job search assistant.
You evaluate job offers against the user's CV using a structured A-G scoring system.

Your evaluation methodology is defined below. Follow it exactly.

═══════════════════════════════════════════════════════
SYSTEM CONTEXT (_shared.md)
═══════════════════════════════════════════════════════
${sharedContext}

═══════════════════════════════════════════════════════
EVALUATION MODE (oferta.md)
═══════════════════════════════════════════════════════
${ofertaLogic}

═══════════════════════════════════════════════════════
CANDIDATE RESUME (cv.md)
═══════════════════════════════════════════════════════
${cvContent}

═══════════════════════════════════════════════════════
IMPORTANT OPERATING RULES FOR THIS CLI SESSION
═══════════════════════════════════════════════════════
1. You do NOT have access to WebSearch, Playwright, or file writing tools.
   - For Block D (Comp research): provide salary estimates based on your training data, clearly noted as estimates.
   - For Block G (Legitimacy): analyze the JD text only; skip URL/page freshness checks.
   - Post-evaluation file saving is handled by the script, not by you.
2. Generate Blocks A through G in full, in English, unless the JD is in another language.
3. At the very end, output a machine-readable summary block in this exact format:

---SCORE_SUMMARY---
COMPANY: <company name or "Unknown">
ROLE: <role title>
SCORE: <global score as decimal, e.g. 3.8>
ARCHETYPE: <detected archetype>
LEGITIMACY: <High Confidence | Proceed with Caution | Suspicious>
---END_SUMMARY---
`;

// ---------------------------------------------------------------------------
// Call Gemini API
// ---------------------------------------------------------------------------
console.log(`🤖  Calling ${provider} (${modelName})... this may take 30-60 seconds.\n`);

let evaluationText;
try {
  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.4,      // deterministic enough for structured evaluation
        maxOutputTokens: 8192, // full 7-block evaluation
      },
    });
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `\n\nJOB DESCRIPTION TO EVALUATE:\n\n${jdText}` },
    ]);
    evaluationText = result.response.text();
  } else {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `JOB DESCRIPTION TO EVALUATE:\n\n${jdText}` },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI API ${response.status}: ${errBody}`);
    }
    const data = await response.json();
    evaluationText = data?.choices?.[0]?.message?.content;
    if (!evaluationText) {
      throw new Error('OpenAI API returned no evaluation text');
    }
  }
} catch (err) {
  console.error(`❌  ${provider} API error:`, err.message);
  if (provider === 'gemini' && err.message?.includes('API_KEY')) {
    console.error('    Check your GEMINI_API_KEY in .env');
  } else if (provider === 'openai' && err.message?.includes('401')) {
    console.error('    Check your OPENAI_API_KEY in .env');
  } else if (err.message?.includes('quota') || err.message?.includes('rate') || err.message?.includes('429')) {
    console.error('    Rate/quota issue detected. Wait a bit and retry.');
  }
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Display evaluation
// ---------------------------------------------------------------------------
console.log('\n' + '═'.repeat(66));
console.log(`  CAREER-OPS EVALUATION — powered by ${provider}`);
console.log('═'.repeat(66) + '\n');
console.log(evaluationText);

// ---------------------------------------------------------------------------
// Parse score summary
// ---------------------------------------------------------------------------
const summaryMatch = evaluationText.match(
  /---SCORE_SUMMARY---\s*([\s\S]*?)---END_SUMMARY---/
);

let company    = 'unknown';
let role       = 'unknown';
let score      = '?';
let archetype  = 'unknown';
let legitimacy = 'unknown';

if (summaryMatch) {
  const block = summaryMatch[1];
  const extract = (key) => {
    const m = block.match(new RegExp(`${key}:\\s*(.+)`));
    return m ? m[1].trim() : 'unknown';
  };
  company    = extract('COMPANY');
  role       = extract('ROLE');
  score      = extract('SCORE');
  archetype  = extract('ARCHETYPE');
  legitimacy = extract('LEGITIMACY');
}

// ---------------------------------------------------------------------------
// Save report
// ---------------------------------------------------------------------------
if (saveReport) {
  try {
    if (!existsSync(PATHS.reports)) {
      mkdirSync(PATHS.reports, { recursive: true });
    }

    const num         = nextReportNumber();
    const today       = new Date().toISOString().split('T')[0];
    const companySlug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filename    = `${num}-${companySlug}-${today}.md`;
    const reportPath  = join(PATHS.reports, filename);

    const reportContent = `# Evaluation: ${company} — ${role}

**Date:** ${today}
**Archetype:** ${archetype}
**Score:** ${score}/5
**Legitimacy:** ${legitimacy}
**PDF:** pending
**Tool:** ${provider} (${modelName})

---

${evaluationText.replace(/---SCORE_SUMMARY---[\s\S]*?---END_SUMMARY---/, '').trim()}
`;

    writeFileSync(reportPath, reportContent, 'utf-8');
    console.log(`\n✅  Report saved: reports/${filename}`);

    // Append tracker entry reminder
    console.log(`\n📊  Tracker entry (add to data/applications.md):`);
    console.log(`    | ${num} | ${today} | ${company} | ${role} | ${score} | Evaluada | ❌ | [${num}](reports/${filename}) |`);
  } catch (err) {
    console.warn(`⚠️   Could not save report: ${err.message}`);
  }
}

console.log('\n' + '─'.repeat(66));
console.log(`  Score: ${score}/5  |  Archetype: ${archetype}  |  Legitimacy: ${legitimacy}`);
console.log('─'.repeat(66) + '\n');
