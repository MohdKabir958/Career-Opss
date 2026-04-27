import { readFileSync } from "node:fs";
export function parseApplicationsFile(filePath) {
    const text = readFileSync(filePath, "utf8");
    const lines = text.split(/\r?\n/);
    const rows = [];
    for (const line of lines) {
        if (!line.trim().startsWith("|"))
            continue;
        const cols = line.split("|").map((part) => part.trim()).filter(Boolean);
        if (cols.length < 8)
            continue;
        if (cols[0].toLowerCase() === "id" || cols[0].startsWith("---"))
            continue;
        rows.push({
            id: cols[0],
            date: cols[1] ?? "",
            company: cols[2] ?? "",
            role: cols[3] ?? "",
            score: cols[4] ?? "",
            status: cols[5] ?? "",
            applied: cols[6] ?? "",
            report: cols[7] ?? "",
        });
    }
    return rows;
}
