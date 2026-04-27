export function summarizeDoctorOutput(output) {
    const issues = Number(output.match(/Result:\s+(\d+)\s+issues found/i)?.[1] ?? 0);
    const checksPassed = (output.match(/✓/g) ?? []).length;
    const checksFailed = (output.match(/✗/g) ?? []).length;
    return {
        issues,
        checksPassed,
        checksFailed,
        healthy: issues === 0,
    };
}
export function summarizeVerifyOutput(output) {
    const hasError = /error|failed|❌/i.test(output);
    return {
        healthy: !hasError,
        raw: output,
    };
}
