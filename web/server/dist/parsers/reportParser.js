import path from "node:path";
function extractField(content, key) {
    const match = content.match(new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+)`));
    return match?.[1]?.trim();
}
export function parseReport(filePath, content) {
    const firstLine = content.split(/\r?\n/)[0] ?? "";
    const title = firstLine.replace(/^#\s*/, "").trim();
    const companyRole = title.match(/^Evaluation:\s*(.+?)(?:\s+—\s+(.+))?$/i);
    return {
        name: path.basename(filePath),
        path: filePath,
        company: companyRole?.[1] ?? undefined,
        role: companyRole?.[2] ?? undefined,
        date: extractField(content, "Date"),
        score: extractField(content, "Score")?.replace("/5", "").trim(),
        archetype: extractField(content, "Archetype"),
        legitimacy: extractField(content, "Legitimacy"),
    };
}
