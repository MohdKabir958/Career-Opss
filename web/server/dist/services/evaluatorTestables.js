function parseScore(markdown) {
    const match = markdown.match(/Score:\s*(\d{1,3})\s*\/\s*100/i);
    if (!match)
        return null;
    const value = Number(match[1]);
    if (Number.isNaN(value))
        return null;
    return Math.max(0, Math.min(100, value));
}
function parseArchetype(markdown) {
    const match = markdown.match(/Archetype:\s*([^\n\r]+)/i);
    if (!match)
        return null;
    return match[1].trim().split(/\s+/).slice(0, 2).join(" ").replace(/[.,;:]+$/, "");
}
function parseLegitimacy(markdown) {
    const match = markdown.match(/Legitimacy:\s*([^\n\r]+)/i);
    if (!match)
        return null;
    return match[1].trim().split(/\s+/).slice(0, 2).join(" ").replace(/[.,;:]+$/, "");
}
function parseJobTitle(markdown, jobDescription) {
    const fromReport = markdown.match(/Title:\s*([^\n]+)/i);
    if (fromReport)
        return fromReport[1].trim().slice(0, 200);
    const fromJD = jobDescription.match(/(?:title|role|position)[:\-]\s*([^\n]+)/i);
    if (fromJD)
        return fromJD[1].trim().slice(0, 200);
    const firstLine = jobDescription.split("\n").find((l) => l.trim().length > 0);
    return firstLine ? firstLine.trim().slice(0, 200) : null;
}
export const __testables = { parseScore, parseArchetype, parseLegitimacy, parseJobTitle };
