import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { resolveRepoRoot } from "./repoPaths.js";
import { HttpError } from "../middleware/error.js";
const TITLE_FILTER_HEADER = `# -- Title filter --
# The scanner uses these keywords to decide if a title is relevant.
# At least 1 positive must match AND 0 negatives must match (case-insensitive).
# Edited via the Career-Ops dashboard (Targeting page).
`;
function portalsPath() {
    return path.join(resolveRepoRoot(), "portals.yml");
}
function templatePath() {
    return path.join(resolveRepoRoot(), "templates", "portals.example.yml");
}
function ensurePortalsExist() {
    const p = portalsPath();
    if (fs.existsSync(p))
        return p;
    const tpl = templatePath();
    if (!fs.existsSync(tpl)) {
        throw new HttpError(500, "portals.yml not found and templates/portals.example.yml is missing");
    }
    fs.copyFileSync(tpl, p);
    return p;
}
function normalizeStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter((s) => s.length > 0);
}
function uniqueCaseInsensitive(values) {
    const seen = new Set();
    const out = [];
    for (const v of values) {
        const key = v.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            out.push(v);
        }
    }
    return out;
}
export function readPortals() {
    const p = ensurePortalsExist();
    const raw = fs.readFileSync(p, "utf-8");
    let parsed;
    try {
        parsed = yaml.load(raw);
    }
    catch (error) {
        throw new HttpError(500, `portals.yml is not valid YAML: ${error.message}`);
    }
    if (!parsed || typeof parsed !== "object") {
        throw new HttpError(500, "portals.yml did not parse to an object");
    }
    const tf = (parsed.title_filter ?? {});
    const title_filter = {
        positive: normalizeStringArray(tf.positive),
        negative: normalizeStringArray(tf.negative),
        seniority_boost: normalizeStringArray(tf.seniority_boost),
    };
    const tracked = Array.isArray(parsed.tracked_companies)
        ? parsed.tracked_companies
        : [];
    const tracked_companies = tracked
        .map((row) => {
        if (!row || typeof row.name !== "string")
            return null;
        return {
            name: row.name,
            careers_url: typeof row.careers_url === "string" ? row.careers_url : undefined,
            api: typeof row.api === "string" ? row.api : undefined,
            scan_method: typeof row.scan_method === "string" ? row.scan_method : undefined,
            scan_query: typeof row.scan_query === "string" ? row.scan_query : undefined,
            notes: typeof row.notes === "string" ? row.notes : undefined,
            enabled: typeof row.enabled === "boolean" ? row.enabled : true,
        };
    })
        .filter((row) => row !== null);
    const enabledCompanies = tracked_companies.filter((c) => c.enabled !== false).length;
    const searchQueriesCount = Array.isArray(parsed.search_queries)
        ? parsed.search_queries.length
        : 0;
    return {
        title_filter,
        tracked_companies,
        totalCompanies: tracked_companies.length,
        enabledCompanies,
        searchQueriesCount,
    };
}
function escapeYamlString(value) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function formatTitleFilterBlock(tf) {
    const lines = [];
    lines.push(TITLE_FILTER_HEADER.trimEnd());
    lines.push("");
    lines.push("title_filter:");
    lines.push("  positive:");
    for (const v of tf.positive)
        lines.push(`    - ${escapeYamlString(v)}`);
    lines.push("  negative:");
    for (const v of tf.negative)
        lines.push(`    - ${escapeYamlString(v)}`);
    lines.push("  seniority_boost:");
    for (const v of tf.seniority_boost)
        lines.push(`    - ${escapeYamlString(v)}`);
    return lines.join("\n");
}
/**
 * Replace the existing title_filter block (and its preceding "# -- Title filter --" comment header,
 * if present) with a freshly formatted block. Everything else in portals.yml is preserved as-is,
 * which means user comments, search_queries, tracked_companies, etc. survive untouched.
 */
export function writeTitleFilter(next) {
    const cleaned = {
        positive: uniqueCaseInsensitive(normalizeStringArray(next.positive)),
        negative: uniqueCaseInsensitive(normalizeStringArray(next.negative)),
        seniority_boost: uniqueCaseInsensitive(normalizeStringArray(next.seniority_boost)),
    };
    const p = ensurePortalsExist();
    const raw = fs.readFileSync(p, "utf-8");
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    const lines = raw.split(/\r?\n/);
    let startIdx = -1;
    for (let i = 0; i < lines.length; i += 1) {
        if (/^title_filter:\s*$/.test(lines[i])) {
            startIdx = i;
            break;
        }
    }
    if (startIdx === -1) {
        throw new HttpError(500, "title_filter section not found in portals.yml");
    }
    let headerStartIdx = startIdx;
    let scan = startIdx - 1;
    while (scan >= 0 && lines[scan].trim() === "")
        scan -= 1;
    while (scan >= 0 && lines[scan].startsWith("#")) {
        headerStartIdx = scan;
        scan -= 1;
    }
    while (scan >= 0 && lines[scan].trim() === "") {
        headerStartIdx = scan;
        scan -= 1;
    }
    if (headerStartIdx < 0)
        headerStartIdx = 0;
    let nextKeyIdx = lines.length;
    for (let i = startIdx + 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (line.length === 0)
            continue;
        if (/^[A-Za-z_][\w-]*:/.test(line)) {
            nextKeyIdx = i;
            break;
        }
    }
    let endIdx = nextKeyIdx;
    let scanEnd = nextKeyIdx - 1;
    while (scanEnd > startIdx && lines[scanEnd].trim() === "")
        scanEnd -= 1;
    while (scanEnd > startIdx && lines[scanEnd].startsWith("#")) {
        endIdx = scanEnd;
        scanEnd -= 1;
    }
    while (scanEnd > startIdx && lines[scanEnd].trim() === "") {
        endIdx = scanEnd;
        scanEnd -= 1;
    }
    const before = lines.slice(0, headerStartIdx).join(eol);
    const after = lines.slice(endIdx).join(eol);
    const block = formatTitleFilterBlock(cleaned).replace(/\n/g, eol);
    const parts = [];
    if (before.length > 0)
        parts.push(before.replace(/\s+$/, ""));
    parts.push(block);
    if (after.length > 0)
        parts.push(after.replace(/^\s+/, ""));
    const next_raw = `${parts.join(`${eol}${eol}`)}${eol}`;
    fs.writeFileSync(p, next_raw, "utf-8");
    return cleaned;
}
