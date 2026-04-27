import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { globSync } from "glob";
import { parseApplicationsFile } from "../parsers/applicationsParser.js";
import { parseReport } from "../parsers/reportParser.js";
export class FileStore {
    repoRoot;
    constructor(repoRoot) {
        this.repoRoot = repoRoot;
    }
    getReports() {
        const reportFiles = globSync(path.join(this.repoRoot, "reports", "*.md")).sort().reverse();
        return reportFiles.map((file) => parseReport(file, readFileSync(file, "utf8")));
    }
    getReportContent(name) {
        const reportPath = path.join(this.repoRoot, "reports", name);
        if (!existsSync(reportPath))
            return null;
        return readFileSync(reportPath, "utf8");
    }
    getTrackerRows() {
        const trackerPath = path.join(this.repoRoot, "data", "applications.md");
        if (!existsSync(trackerPath))
            return [];
        return parseApplicationsFile(trackerPath);
    }
    updateTrackerStatus(rowId, newStatus) {
        const trackerPath = path.join(this.repoRoot, "data", "applications.md");
        if (!existsSync(trackerPath))
            return false;
        const text = readFileSync(trackerPath, "utf8");
        const lines = text.split(/\r?\n/);
        let updated = false;
        const rewritten = lines.map((line) => {
            if (!line.trim().startsWith("|"))
                return line;
            const cols = line.split("|").map((part) => part.trim()).filter(Boolean);
            if (cols.length < 8 || cols[0] !== rowId)
                return line;
            cols[5] = newStatus;
            updated = true;
            return `| ${cols.join(" | ")} |`;
        });
        if (updated) {
            writeFileSync(trackerPath, `${rewritten.join("\n")}\n`, "utf8");
        }
        return updated;
    }
}
