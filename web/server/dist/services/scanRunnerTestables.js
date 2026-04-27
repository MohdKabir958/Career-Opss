function parseRowsFromMarkdown(markdownContent) {
    const rows = [];
    const lines = markdownContent.split(/\r?\n/);
    for (const line of lines) {
        if (!line.trim().startsWith("|"))
            continue;
        if (/^\|\s*-+/.test(line))
            continue;
        const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
        if (cols.length < 3)
            continue;
        if (cols[0].toLowerCase() === "company")
            continue;
        const [company, title, url, location, source] = cols;
        if (!url || !/^https?:\/\//i.test(url))
            continue;
        rows.push({
            company: company || "",
            title: title || "",
            url,
            location: location || undefined,
            source: source || undefined,
        });
    }
    return rows;
}
function parseRowsFromStdout(stdout) {
    const rows = [];
    const lines = stdout.split(/\r?\n/);
    for (const line of lines) {
        const urlMatch = line.match(/https?:\/\/\S+/);
        if (!urlMatch)
            continue;
        const url = urlMatch[0].replace(/[)>\].,;]+$/, "");
        const before = line.slice(0, urlMatch.index ?? 0).trim();
        const parts = before.split(/[-—|·]+/).map((s) => s.trim()).filter(Boolean);
        const title = parts.pop() || "Unknown role";
        const company = parts.pop() || "Unknown company";
        rows.push({ company, title, url });
    }
    return rows;
}
export const __scanTestables = { parseRowsFromMarkdown, parseRowsFromStdout };
